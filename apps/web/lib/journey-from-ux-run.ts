/**
 * Convert a UX Journey Agent run (chat inspect or study wave) into a magazine Journey.
 * Prefers evidence-rich AI (`journey.from_ux_run`); falls back to deterministic phases.
 */

import type {
  JourneyFromUxRunRequest,
  JourneyFromUxRunResponse,
  JourneyPhase,
} from '@audion-v3/contracts'
import { runAssistJson } from './ai/assist'
import { shouldPreferAiNative } from './runtime-config'
import { storeCreateJourney, storeJourneyDetail } from './fixtures/journey-store'
import {
  storeGetUxJourneyRunByJobId,
  storeMarkUxJourneyRunDerivedJourney,
} from './fixtures/ux-journey-run-store'
import {
  storeMarkRunDerivedJourney,
  storeUxStudyDetail,
  storeUxWaveDetail,
} from './fixtures/ux-study-store'
import {
  fetchPersonaApi,
  shouldPreferAiLive,
  shouldRequireAiLive,
} from './persona-api-proxy'
import { isUxJourneyAgentConfigured, uxJourneyAgentGet } from './ux-journey-agent-client'

export const JOURNEY_FROM_UX_RUN_PATH = '/journeys/from-ux-run'

function phasesFromRun(runKey: string, task: string, url: string): JourneyPhase[] {
  const prefix = `ux-${runKey}`
  return [
    {
      id: `${prefix}-phase-1`,
      name: 'Arrive',
      order: 0,
      summary: `Open ${url}`,
      elements: [
        { id: `${prefix}-el-1`, kind: 'action', label: 'Land on target URL', order: 0 },
        { id: `${prefix}-el-2`, kind: 'thought', label: 'What is the first clear action?', order: 1 },
      ],
    },
    {
      id: `${prefix}-phase-2`,
      name: 'Attempt',
      order: 1,
      summary: task.slice(0, 160) || 'Complete the assigned task',
      elements: [
        { id: `${prefix}-el-3`, kind: 'action', label: 'Follow task steps', order: 0 },
        { id: `${prefix}-el-4`, kind: 'pain', label: 'Friction / blockers from the run', order: 1 },
      ],
    },
    {
      id: `${prefix}-phase-3`,
      name: 'Outcome',
      order: 2,
      summary: 'Record goal reach and findings',
      elements: [
        { id: `${prefix}-el-5`, kind: 'opportunity', label: 'Evidence-backed next step', order: 0 },
        { id: `${prefix}-el-6`, kind: 'feeling', label: 'Confidence in the path', order: 1 },
      ],
    },
  ]
}

function phasesFromSteps(
  runKey: string,
  steps: Array<Record<string, unknown>>,
): JourneyPhase[] | null {
  if (!steps.length) return null
  const chunk = Math.max(1, Math.ceil(steps.length / 4))
  const phases: JourneyPhase[] = []
  for (let i = 0; i < steps.length; i += chunk) {
    const slice = steps.slice(i, i + chunk)
    const idx = phases.length
    const prefix = `ux-${runKey}-p${idx}`
    const first = slice[0]
    const name =
      typeof first?.target === 'string' && first.target.trim()
        ? String(first.target).slice(0, 48)
        : `Phase ${idx + 1}`
    phases.push({
      id: `${prefix}`,
      name,
      order: idx,
      summary: slice
        .map((s) => [s.action, s.target].filter(Boolean).join(' · '))
        .filter(Boolean)
        .slice(0, 3)
        .join('; '),
      elements: slice.slice(0, 6).map((s, ei) => ({
        id: `${prefix}-el-${ei}`,
        kind: 'action' as const,
        label: String(s.action || s.reasoning || `Step ${ei + 1}`).slice(0, 160),
        order: ei,
      })),
    })
  }
  return phases.length ? phases : null
}

type AiPhasePayload = {
  phases?: Array<{
    name?: string
    summary?: string
    emotion?: string
    elements?: Array<{ kind?: string; label?: string }>
  }>
}

async function tryAiPhases(input: {
  url: string
  task: string
  steps: unknown[]
  scorecard: Record<string, unknown> | null
  personaSummary: string
}): Promise<JourneyPhase[] | null> {
  if (!shouldPreferAiNative()) return null
  const stepsBrief = input.steps
    .slice(0, 40)
    .map((s, i) => {
      const row = s as Record<string, unknown>
      return `${i + 1}. ${row.action ?? ''} @ ${row.target ?? ''} — ${String(row.reasoning ?? '').slice(0, 120)}`
    })
    .join('\n')
  const observations = input.steps
    .map((s) => (s as Record<string, unknown>).observations)
    .filter(Boolean)
    .slice(0, 20)
  const assist = await runAssistJson<AiPhasePayload>('journey.from_ux_run', {
    locale: 'en',
    generated_text_locale_name: 'English',
    site_url: input.url,
    task: input.task,
    journey_type: 'ux_audit',
    persona_summary: input.personaSummary,
    scorecard_summary: input.scorecard ? JSON.stringify(input.scorecard).slice(0, 4000) : 'n/a',
    steps_brief: stepsBrief || 'n/a',
    observations_brief: observations.length ? JSON.stringify(observations).slice(0, 4000) : 'n/a',
  })
  if (!('ok' in assist) || !assist.ok || !assist.data.phases?.length) return null
  return assist.data.phases.slice(0, 8).map((p, i) => ({
    id: `ai-phase-${i}`,
    name: (p.name || `Phase ${i + 1}`).slice(0, 80),
    order: i,
    summary: (p.summary || '').slice(0, 400),
    elements: (p.elements ?? []).slice(0, 8).map((el, ei) => ({
      id: `ai-phase-${i}-el-${ei}`,
      kind: (['action', 'thought', 'pain', 'opportunity', 'feeling'].includes(String(el.kind))
        ? el.kind
        : 'action') as 'action' | 'thought' | 'pain' | 'opportunity' | 'feeling',
      label: (el.label || 'Step').slice(0, 160),
      order: ei,
    })),
  }))
}

async function loadEvidence(jobId: string | null | undefined): Promise<{
  steps: unknown[]
  scorecard: Record<string, unknown> | null
  url: string | null
  task: string | null
  derivedJourneyId: string | null
}> {
  if (!jobId) {
    return { steps: [], scorecard: null, url: null, task: null, derivedJourneyId: null }
  }
  const stored = await storeGetUxJourneyRunByJobId(jobId)
  if (stored) {
    return {
      steps: stored.steps,
      scorecard: stored.scorecard,
      url: stored.siteUrl,
      task: stored.task,
      derivedJourneyId: stored.derivedJourneyId,
    }
  }
  if (isUxJourneyAgentConfigured()) {
    try {
      const live = await uxJourneyAgentGet(jobId)
      return {
        steps: live.result?.steps ?? [],
        scorecard: (live.result?.scorecard as Record<string, unknown> | null) ?? null,
        url: live.url ?? null,
        task: live.task ?? null,
        derivedJourneyId: null,
      }
    } catch {
      /* fall through */
    }
  }
  return { steps: [], scorecard: null, url: null, task: null, derivedJourneyId: null }
}

export async function runStubConvertUxRunToJourney(
  body: JourneyFromUxRunRequest,
): Promise<JourneyFromUxRunResponse | { error: string; status: number }> {
  const wantAi = body.mode !== 'deterministic'

  const isChatInspect =
    body.source === 'chat_inspect' ||
    Boolean(body.jobId?.startsWith('chat-inspect-')) ||
    Boolean(body.jobId && !body.studyId)

  if (isChatInspect) {
    const evidence = await loadEvidence(body.jobId)
    if (evidence.derivedJourneyId) {
      const existing = await storeJourneyDetail(evidence.derivedJourneyId)
      if (existing) {
        return {
          stubbed: true,
          journey: {
            id: existing.id,
            name: existing.name,
            phaseCount: existing.phaseCount,
          },
          mode: wantAi ? 'ai' : 'deterministic',
          fallbackUsed: false,
          alreadyConverted: true,
          target: { method: 'POST', path: JOURNEY_FROM_UX_RUN_PATH, body: body as unknown as Record<string, unknown> },
        }
      }
    }

    const url = body.url?.trim() || evidence.url || 'https://example.com'
    const task = body.task?.trim() || evidence.task || `Inspect ${url}`
    const runKey = (body.jobId || `chat-inspect-${Date.now().toString(36)}`).replace(
      /^chat-inspect-/,
      '',
    )
    const hostname = (() => {
      try {
        return new URL(url).hostname
      } catch {
        return 'site'
      }
    })()
    const name = body.journeyName?.trim() || `Chat inspect · ${hostname}`

    let phases: JourneyPhase[] | null = null
    let fallbackUsed = false
    let mode: 'ai' | 'deterministic' = 'deterministic'
    if (wantAi) {
      phases = await tryAiPhases({
        url,
        task,
        steps: evidence.steps,
        scorecard: evidence.scorecard,
        personaSummary: body.personaId || 'persona',
      })
      if (phases) mode = 'ai'
      else fallbackUsed = true
    }
    if (!phases) {
      phases =
        phasesFromSteps(runKey, evidence.steps as Array<Record<string, unknown>>) ||
        phasesFromRun(runKey, task, url)
    }

    const journey = await storeCreateJourney({
      name,
      journeyType: body.journeyType?.trim() || 'ux_audit',
      status: 'draft',
      description: `Converted from chat inspect_website (${url}). Task: ${task}`,
      targetGroupId: body.targetGroupId ?? null,
      projectId: body.projectId ?? null,
      phases,
    })
    if (body.jobId) {
      await storeMarkUxJourneyRunDerivedJourney(body.jobId, journey.id)
    }
    return {
      stubbed: true,
      journey: { id: journey.id, name: journey.name, phaseCount: journey.phaseCount },
      mode,
      fallbackUsed,
      alreadyConverted: false,
      target: {
        method: 'POST',
        path: JOURNEY_FROM_UX_RUN_PATH,
        body: {
          source: 'chat_inspect',
          jobId: body.jobId,
          personaId: body.personaId,
          url,
          task,
        },
      },
    }
  }

  const studyId = body.studyId?.trim()
  const waveId = body.waveId?.trim()
  const runKey = body.runKey?.trim()
  if (!studyId || !waveId || !runKey) {
    return { error: 'studyId, waveId, and runKey are required in fixture mode', status: 400 }
  }
  const wave = await storeUxWaveDetail(studyId, waveId)
  if (!wave) return { error: 'Wave not found', status: 404 }
  const run = wave.runs.find((r) => r.runKey === runKey)
  if (!run) return { error: 'Run not found', status: 404 }

  const modeReq = body.mode === 'deterministic' ? 'deterministic' : 'ai'
  const upstreamBody: Record<string, unknown> = {
    jobId: body.jobId ?? run.jobId,
    personaId: body.personaId ?? run.personaId,
    mode: modeReq,
    journeyName: body.journeyName ?? undefined,
    journeyType: body.journeyType ?? 'ux_audit',
    organizationId: body.organizationId ?? 'org-stub',
  }

  if (run.derivedJourneyId) {
    const existing = await storeJourneyDetail(run.derivedJourneyId)
    if (existing) {
      return {
        stubbed: true,
        journey: {
          id: existing.id,
          name: existing.name,
          phaseCount: existing.phaseCount,
        },
        mode: modeReq,
        fallbackUsed: false,
        alreadyConverted: true,
        target: { method: 'POST', path: JOURNEY_FROM_UX_RUN_PATH, body: upstreamBody },
      }
    }
  }

  const evidence = await loadEvidence(body.jobId ?? run.jobId)
  let phases: JourneyPhase[] | null = null
  let fallbackUsed = false
  let mode: 'ai' | 'deterministic' = 'deterministic'
  if (modeReq === 'ai') {
    phases = await tryAiPhases({
      url: run.url,
      task: run.task,
      steps: evidence.steps,
      scorecard: evidence.scorecard,
      personaSummary: run.personaName || run.personaId || 'persona',
    })
    if (phases) mode = 'ai'
    else fallbackUsed = true
  }
  if (!phases) {
    phases =
      phasesFromSteps(run.runKey, evidence.steps as Array<Record<string, unknown>>) ||
      phasesFromRun(run.runKey, run.task, run.url)
  }

  const name = body.journeyName?.trim() || `${run.personaName || run.runKey} · ${wave.waveKey}`
  const journey = await storeCreateJourney({
    name,
    journeyType: body.journeyType?.trim() || 'ux_audit',
    status: 'draft',
    description: `Converted from study wave run ${run.runKey} (${wave.waveKey}). Task: ${run.task}`,
    targetGroupId: body.targetGroupId ?? null,
    projectId: body.projectId ?? (await storeUxStudyDetail(studyId))?.projectId ?? null,
    phases,
  })
  await storeMarkRunDerivedJourney(studyId, waveId, runKey, journey.id)
  if (run.jobId) await storeMarkUxJourneyRunDerivedJourney(run.jobId, journey.id)

  return {
    stubbed: true,
    journey: { id: journey.id, name: journey.name, phaseCount: journey.phaseCount },
    mode,
    fallbackUsed,
    alreadyConverted: false,
    target: { method: 'POST', path: JOURNEY_FROM_UX_RUN_PATH, body: upstreamBody },
  }
}

export async function runLiveConvertUxRunToJourney(
  body: JourneyFromUxRunRequest,
  authorization?: string | null,
): Promise<JourneyFromUxRunResponse | { error: string; status: number; detail?: string }> {
  // Prefer local evidence-rich convert (V3 agent + Postgres) over V2 persona-api.
  if (body.jobId || body.source === 'chat_inspect' || (body.studyId && body.waveId && body.runKey)) {
    return runStubConvertUxRunToJourney(body)
  }

  const upstreamBody: Record<string, unknown> = {
    jobId: body.jobId ?? undefined,
    personaId: body.personaId ?? undefined,
    mode: body.mode ?? 'ai',
    journeyName: body.journeyName ?? undefined,
    journeyType: body.journeyType ?? 'ux_audit',
    targetGroupId: body.targetGroupId ?? undefined,
    projectId: body.projectId ?? undefined,
    organizationId: body.organizationId ?? 'default',
    locale: body.locale ?? undefined,
  }
  if (!upstreamBody.jobId && body.studyId && body.waveId && body.runKey) {
    const wave = await storeUxWaveDetail(body.studyId, body.waveId)
    const run = wave?.runs.find((r) => r.runKey === body.runKey)
    if (run?.jobId) upstreamBody.jobId = run.jobId
    if (!upstreamBody.personaId && run?.personaId) upstreamBody.personaId = run.personaId
  }

  const res = await fetchPersonaApi(JOURNEY_FROM_UX_RUN_PATH, {
    body: upstreamBody,
    authorization,
  })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = res.json as Record<string, unknown> | null
  const journeyRec =
    json && typeof json.journey === 'object' && json.journey
      ? (json.journey as Record<string, unknown>)
      : null
  if (!journeyRec?.id) {
    return { error: 'Unexpected from-ux-run response', status: 502 }
  }
  const phases = Array.isArray(journeyRec.phases) ? journeyRec.phases : []
  const modeRaw = String(json?.mode ?? body.mode ?? 'ai')
  const mode = modeRaw === 'deterministic' ? 'deterministic' : 'ai'

  if (body.studyId && body.waveId && body.runKey) {
    await storeMarkRunDerivedJourney(body.studyId, body.waveId, body.runKey, String(journeyRec.id))
  }

  return {
    stubbed: false,
    journey: {
      id: String(journeyRec.id),
      name: String(journeyRec.name ?? 'Journey'),
      phaseCount: phases.length || Number(journeyRec.phaseCount ?? 0),
    },
    mode,
    fallbackUsed: Boolean(json?.fallbackUsed),
    alreadyConverted: Boolean(json?.alreadyConverted),
    target: { method: 'POST', path: JOURNEY_FROM_UX_RUN_PATH, body: upstreamBody },
  }
}

export async function convertUxRunToJourney(
  request: Request,
  body: JourneyFromUxRunRequest,
): Promise<
  | { ok: true; data: JourneyFromUxRunResponse }
  | { ok: false; error: string; status: number; detail?: string }
> {
  // Always prefer local V3 convert when we have a job / chat_inspect / study run.
  if (body.jobId || body.source === 'chat_inspect' || (body.studyId && body.waveId && body.runKey)) {
    const stub = await runStubConvertUxRunToJourney(body)
    if ('error' in stub) return { ok: false, error: stub.error, status: stub.status }
    return { ok: true, data: stub }
  }

  if (shouldPreferAiLive()) {
    const live = await runLiveConvertUxRunToJourney(
      body,
      request.headers.get('authorization'),
    )
    if (!('error' in live)) return { ok: true, data: live }
    if (shouldRequireAiLive()) {
      return { ok: false, error: live.error, status: live.status, detail: live.detail }
    }
  }

  const stub = await runStubConvertUxRunToJourney(body)
  if ('error' in stub) return { ok: false, error: stub.error, status: stub.status }
  return { ok: true, data: stub }
}
