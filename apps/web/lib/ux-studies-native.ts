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
import { storeUpsertUxJourneyRun } from './fixtures/ux-journey-run-store'
import { storePersonaDetail } from './fixtures/persona-store'
import { resolveAgentPersonaContext } from './chat/resolve-agent-persona-context'
import {
  isUxJourneyAgentConfigured,
  uxJourneyAgentGet,
  uxJourneyAgentStart,
} from './ux-journey-agent-client'
import { mapAgentResultToWaveRun } from './ux-wave-scorecard'
import { deriveFlowVerdict, mergeFlowVerdictIntoWaveRun } from './ux-flow-verdict'
import type { UxTestFlow, UxFlowCursor } from '@audion-v3/contracts'

export async function startUxWaveNativeOrFixture(
  studyId: string,
  waveId: string,
  opts?: { force?: boolean },
): Promise<UxWaveDetail | null> {
  const force = Boolean(opts?.force)
  let wave = await storeUxWaveDetail(studyId, waveId)
  if (!wave) return null

  if (force) {
    // Clear prior agent outcomes, then mark running without storeStartUxWave —
    // that helper preserves agentStatus==='complete' and would skip re-queue.
    const resetRuns: UxWaveRunItem[] = wave.runs.map((run) => {
      const shouldReset =
        run.agentStatus === 'complete' ||
        run.agentStatus === 'running' ||
        run.agentStatus === 'error' ||
        Boolean(run.jobId)
      if (!shouldReset) return run
      return {
        ...run,
        jobId: null,
        agentStatus: 'running',
        agentSuccess: null,
        taskCompleted: null,
        validEvidence: null,
        validEvidenceCaveat: null,
        goalReached: null,
        finding: null,
        blockers: [],
        steps: null,
        categories: {},
      }
    })
    wave = await storePatchUxWaveRuns(studyId, waveId, resetRuns)
    if (!wave) return null
    wave = {
      ...wave,
      status: 'running',
      updatedAt: new Date().toISOString(),
    }
    wave = (await storePatchUxWaveRuns(studyId, waveId, wave.runs)) ?? wave
  } else {
    wave = await storeStartUxWave(studyId, waveId)
    if (!wave) return null
  }

  if (!isUxJourneyAgentConfigured()) return wave

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
    const persona = run.personaId
      ? await resolveAgentPersonaContext(run.personaId, { locale: 'de' })
      : null
    try {
      const { jobId } = await uxJourneyAgentStart({
        url: run.url,
        task: run.task || `Complete study wave task on ${run.url}`,
        persona: persona ?? (run.personaId ? { id: run.personaId } : null),
        maxSteps: run.maxSteps ?? 12,
        flowGraph: run.flowGraph ?? null,
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
        updated.push(
          (() => {
            let mapped = mapAgentResultToWaveRun(run, status)
            if (run.flowGraph?.nodes?.length) {
              const signals = status.result?.gateSignals ?? null
              const verdict = deriveFlowVerdict(run.flowGraph as UxTestFlow, {
                status: status.status,
                steps,
                finalUrl: signals?.finalUrl ?? status.result?.finalUrl,
                finalTitle: signals?.finalTitle ?? status.result?.finalTitle,
                success: status.result?.success,
                error: status.error ?? status.result?.error,
                summary: status.result?.summary,
                cancelled: status.result?.cancelled,
                scorecard: (status.result?.scorecard as Record<string, unknown> | null) ?? null,
                gateSignals: signals,
                flowCursor: (status.flowCursor as UxFlowCursor | null | undefined) ?? null,
                jobId: run.jobId,
              })
              mapped = mergeFlowVerdictIntoWaveRun(mapped, verdict)
            }
            return mapped
          })(),
        )
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
