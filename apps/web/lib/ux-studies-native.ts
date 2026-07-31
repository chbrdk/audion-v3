/**
 * UX study wave Start/Sync — prefer V3 UX Journey Agent when configured.
 */

import type { UxWaveDetail, UxWaveRunItem } from '@audion-v3/contracts'
import { runAssistJson } from './ai/assist'
import { shouldPreferAiNative } from './runtime-config'
import {
  storeStartUxWave,
  storeSyncUxWave,
  storeUxStudyDetail,
  storeUxWaveDetail,
  storePatchUxWaveRuns,
} from './fixtures/ux-study-store'
import { storePersonaDetail } from './fixtures/persona-store'
import { storeUpsertUxJourneyRun } from './fixtures/ux-journey-run-store'
import {
  isUxJourneyAgentConfigured,
  uxJourneyAgentGet,
  uxJourneyAgentStart,
} from './ux-journey-agent-client'

export async function startUxWaveNativeOrFixture(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  const wave = await storeStartUxWave(studyId, waveId)
  if (!wave || !isUxJourneyAgentConfigured()) return wave

  const study = await storeUxStudyDetail(studyId)
  const updated: UxWaveRunItem[] = []
  for (const run of wave.runs) {
    if (run.agentStatus === 'complete') {
      updated.push(run)
      continue
    }
    if (!run.url?.trim()) {
      updated.push(run)
      continue
    }
    const persona = run.personaId ? await storePersonaDetail(run.personaId) : null
    try {
      const { jobId } = await uxJourneyAgentStart({
        url: run.url,
        task: run.task || `Complete study wave task on ${run.url}`,
        persona: persona
          ? {
              id: persona.id,
              name: persona.name,
              role: persona.role,
              bio: persona.bio,
              locale: 'de',
            }
          : run.personaId
            ? { id: run.personaId }
            : null,
        maxSteps: 12,
      })
      await storeUpsertUxJourneyRun({
        personaId: run.personaId || 'unknown',
        jobId,
        task: run.task || `Inspect ${run.url}`,
        siteUrl: run.url,
        projectId: study?.projectId ?? null,
        success: null,
        stepsCount: 0,
        steps: [],
      })
      updated.push({
        ...run,
        jobId,
        agentStatus: 'running',
      })
    } catch {
      updated.push({
        ...run,
        agentStatus: 'running',
        jobId: run.jobId ?? `job-local-${run.runKey}`,
      })
    }
  }
  return storePatchUxWaveRuns(studyId, waveId, updated)
}

export async function syncUxWaveNativeOrFixture(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  if (isUxJourneyAgentConfigured()) {
    const wave = await storeUxWaveDetail(studyId, waveId)
    if (!wave) return null
    const updated: UxWaveRunItem[] = []
    let anyRunning = false
    for (const run of wave.runs) {
      if (run.agentStatus === 'complete' || !run.jobId) {
        updated.push(run)
        continue
      }
      try {
        const status = await uxJourneyAgentGet(run.jobId)
        if (status.status === 'running') {
          anyRunning = true
          updated.push({ ...run, agentStatus: 'running' })
          continue
        }
        const steps = status.result?.steps ?? []
        const success = Boolean(status.result?.success) && status.status === 'complete'
        await storeUpsertUxJourneyRun({
          personaId: run.personaId || 'unknown',
          jobId: run.jobId,
          task: run.task || status.task || '',
          siteUrl: run.url || status.url || '',
          success,
          stepsCount: steps.length,
          scorecard: (status.result?.scorecard as Record<string, unknown> | null) ?? null,
          steps,
        })
        updated.push({
          ...run,
          agentStatus: 'complete',
          agentSuccess: success,
          taskCompleted: success,
          validEvidence: success,
          goalReached: success,
          steps: steps.length || run.steps,
          finding:
            status.result?.summary ||
            run.finding ||
            (success ? 'Browser agent completed run.' : status.error || 'Agent error'),
          frictionScore: run.frictionScore ?? (success ? 7 : 11),
        })
      } catch {
        anyRunning = true
        updated.push(run)
      }
    }
    const patched = await storePatchUxWaveRuns(studyId, waveId, updated)
    if (patched && !anyRunning && patched.status === 'running') {
      // leave status to store helpers
    }
    return patched
  }

  if (!shouldPreferAiNative()) {
    return storeSyncUxWave(studyId, waveId)
  }

  const wave = await storeUxWaveDetail(studyId, waveId)
  if (!wave) return null
  const study = await storeUxStudyDetail(studyId)

  const pending = wave.runs.filter((r) => r.agentStatus !== 'complete')
  if (!pending.length) {
    return storeSyncUxWave(studyId, waveId)
  }

  if (wave.status !== 'running') {
    await storeStartUxWave(studyId, waveId)
  }

  const updated: UxWaveRunItem[] = []
  for (const run of wave.runs) {
    if (run.agentStatus === 'complete') {
      updated.push(run)
      continue
    }
    const persona = run.personaId ? await storePersonaDetail(run.personaId) : null
    const assist = await runAssistJson<{
      outcome?: string
      summary?: string
      findings?: Array<{ severity?: string; title?: string; detail?: string }>
      quotes?: string[]
    }>('ux_study.run_summary', {
      locale: 'en',
      context: [
        `Study: ${study?.name ?? studyId}`,
        `Wave: ${wave.waveKey}`,
        `Run: ${run.runKey}`,
        `Task: ${run.task ?? ''}`,
        `URL: ${run.url ?? ''}`,
        persona
          ? `Persona: ${persona.name} (${persona.role}) — ${persona.bio ?? ''}`
          : `Persona id: ${run.personaId ?? 'unknown'}`,
      ].join('\n'),
    })

    if ('error' in assist) {
      updated.push({
        ...run,
        agentStatus: 'complete',
        agentSuccess: false,
        taskCompleted: false,
        validEvidence: false,
        finding: `Native agent error: ${assist.detail || assist.error}`,
        frictionScore: run.frictionScore ?? 10,
      })
      continue
    }

    const outcome = (assist.data.outcome || 'partial').toLowerCase()
    const ok = outcome === 'pass' || outcome === 'partial'
    const findingParts = [
      assist.data.summary,
      ...(assist.data.findings ?? []).map(
        (f) => `${f.severity ?? 'medium'}: ${f.title ?? ''} — ${f.detail ?? ''}`,
      ),
      ...(assist.data.quotes ?? []).map((q) => `“${q}”`),
    ].filter(Boolean)

    updated.push({
      ...run,
      agentStatus: 'complete',
      agentSuccess: ok,
      taskCompleted: outcome === 'pass',
      validEvidence: ok,
      validEvidenceCaveat: ok ? run.validEvidenceCaveat : 'Native agent: weak evidence',
      goalReached: outcome === 'pass',
      frictionScore: run.frictionScore ?? (ok ? 7 : 11),
      finding: findingParts.join('\n') || 'Native agent completed run.',
    })
  }

  return storePatchUxWaveRuns(studyId, waveId, updated)
}
