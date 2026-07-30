/**
 * Convert a Study wave run (UX Journey Agent job) into a magazine Journey.
 * Fixtures: deterministic phases from run task/url.
 * Live (`auto`/`api`): POST /journeys/from-ux-run on persona-api.
 */

import type {
  JourneyFromUxRunRequest,
  JourneyFromUxRunResponse,
  JourneyPhase,
} from '@audion-v3/contracts'
import { storeCreateJourney, storeJourneyDetail } from './fixtures/journey-store'
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

export function runStubConvertUxRunToJourney(
  body: JourneyFromUxRunRequest,
): JourneyFromUxRunResponse | { error: string; status: number } {
  if (body.source === 'chat_inspect' || body.jobId?.startsWith('chat-inspect-')) {
    const url = body.url?.trim() || 'https://example.com'
    const task = body.task?.trim() || `Inspect ${url}`
    const runKey = (body.jobId || `chat-inspect-${Date.now().toString(36)}`).replace(/^chat-inspect-/, '')
    const mode = body.mode === 'deterministic' ? 'deterministic' : 'ai'
    const hostname = (() => {
      try {
        return new URL(url).hostname
      } catch {
        return 'site'
      }
    })()
    const name = body.journeyName?.trim() || `Chat inspect · ${hostname}`
    const journey = storeCreateJourney({
      name,
      journeyType: body.journeyType?.trim() || 'ux_audit',
      status: 'draft',
      description: `Converted from chat inspect_website (${url}). Task: ${task}`,
      targetGroupId: body.targetGroupId ?? null,
      projectId: body.projectId ?? null,
      phases: phasesFromRun(runKey, task, url),
    })
    return {
      stubbed: true,
      journey: { id: journey.id, name: journey.name, phaseCount: journey.phaseCount },
      mode: 'deterministic',
      fallbackUsed: mode === 'ai',
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
  const wave = storeUxWaveDetail(studyId, waveId)
  if (!wave) return { error: 'Wave not found', status: 404 }
  const run = wave.runs.find((r) => r.runKey === runKey)
  if (!run) return { error: 'Run not found', status: 404 }

  const mode = body.mode === 'deterministic' ? 'deterministic' : 'ai'
  const upstreamBody: Record<string, unknown> = {
    jobId: body.jobId ?? run.jobId,
    personaId: body.personaId ?? run.personaId,
    mode,
    journeyName: body.journeyName ?? undefined,
    journeyType: body.journeyType ?? 'ux_audit',
    organizationId: body.organizationId ?? 'org-stub',
  }

  if (run.derivedJourneyId) {
    const existing = storeJourneyDetail(run.derivedJourneyId)
    if (existing) {
      return {
        stubbed: true,
        journey: {
          id: existing.id,
          name: existing.name,
          phaseCount: existing.phaseCount,
        },
        mode,
        fallbackUsed: false,
        alreadyConverted: true,
        target: { method: 'POST', path: JOURNEY_FROM_UX_RUN_PATH, body: upstreamBody },
      }
    }
  }

  const name =
    body.journeyName?.trim() ||
    `${run.personaName || run.runKey} · ${wave.waveKey}`
  const journey = storeCreateJourney({
    name,
    journeyType: body.journeyType?.trim() || 'ux_audit',
    status: 'draft',
    description: `Converted from study wave run ${run.runKey} (${wave.waveKey}). Task: ${run.task}`,
    targetGroupId: body.targetGroupId ?? null,
    projectId: body.projectId ?? storeUxStudyDetail(studyId)?.projectId ?? null,
    phases: phasesFromRun(run.runKey, run.task, run.url),
  })
  storeMarkRunDerivedJourney(studyId, waveId, runKey, journey.id)

  return {
    stubbed: true,
    journey: { id: journey.id, name: journey.name, phaseCount: journey.phaseCount },
    mode: mode === 'ai' ? 'deterministic' : mode, // stub is always deterministic structure
    fallbackUsed: mode === 'ai',
    alreadyConverted: false,
    target: { method: 'POST', path: JOURNEY_FROM_UX_RUN_PATH, body: upstreamBody },
  }
}

export async function runLiveConvertUxRunToJourney(
  body: JourneyFromUxRunRequest,
  authorization?: string | null,
): Promise<JourneyFromUxRunResponse | { error: string; status: number; detail?: string }> {
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
  if (!upstreamBody.jobId && !body.runKey) {
    return { error: 'jobId (or fixture runKey) required', status: 400 }
  }
  // Live API needs jobId + organizationId; map fixture job from run when present
  if (!upstreamBody.jobId && body.studyId && body.waveId && body.runKey) {
    const wave = storeUxWaveDetail(body.studyId, body.waveId)
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
    storeMarkRunDerivedJourney(body.studyId, body.waveId, body.runKey, String(journeyRec.id))
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

  const stub = runStubConvertUxRunToJourney(body)
  if ('error' in stub) return { ok: false, error: stub.error, status: stub.status }
  return { ok: true, data: stub }
}
