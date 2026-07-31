/**
 * Native UX study agent — LLM summaries for wave runs (no V2 Python agent).
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

export async function startUxWaveNativeOrFixture(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  return storeStartUxWave(studyId, waveId)
}

export async function syncUxWaveNativeOrFixture(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
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

  // Ensure running
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
