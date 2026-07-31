/**
 * Orchestrate chat inspect_website against the V3 UX Journey Agent.
 */

import type { ChatStreamEvent } from '@audion-v3/contracts'
import { storePersonaDetail } from '../fixtures/persona-store'
import { storeUpsertUxJourneyRun } from '../fixtures/ux-journey-run-store'
import {
  isUxJourneyAgentConfigured,
  sleep,
  uxJourneyAgentCancel,
  uxJourneyAgentGet,
  uxJourneyAgentStart,
  type UxJourneyAgentJobStatus,
} from '../ux-journey-agent-client'

function stepMessage(status: UxJourneyAgentJobStatus): string {
  const steps = status.result?.steps ?? []
  const last = steps[steps.length - 1]
  if (!last) return `Agent running… (${status.status})`
  const bits = [
    last.step != null ? `Step ${last.step}` : null,
    last.action,
    last.target,
  ].filter(Boolean)
  return bits.join(' · ') || `Progress (${steps.length} steps)`
}

export async function* runLiveInspectWebsiteStream(input: {
  callId: string
  url: string
  personaId: string
  projectId?: string | null
  task?: string | null
  maxSteps?: number | null
}): AsyncGenerator<ChatStreamEvent> {
  const url = input.url.trim()
  const task = (
    input.task?.trim() || `Inspect ${url} as this persona and note journey friction.`
  ).trim()

  yield {
    type: 'tool_started',
    callId: input.callId,
    tool: 'inspect_website',
    message: `Starting browser inspection of ${url}…`,
  }

  const persona = await storePersonaDetail(input.personaId)
  const personaPayload = persona
    ? {
        id: persona.id,
        name: persona.name,
        role: persona.role,
        bio: persona.bio,
        archetype: persona.archetype,
        interests: persona.interests,
        values: persona.values,
        locale: 'de',
      }
    : { id: input.personaId }

  let jobId: string
  try {
    ;({ jobId } = await uxJourneyAgentStart({
      url,
      task,
      persona: personaPayload,
      maxSteps: input.maxSteps ?? 12,
    }))
  } catch (error) {
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to start UX journey agent',
    }
    return
  }

  yield {
    type: 'tool_progress',
    callId: input.callId,
    tool: 'inspect_website',
    message: `Job ${jobId} started`,
    jobId,
  }

  const intervalMs = 2000
  const maxMs = 15 * 60 * 1000
  const started = Date.now()
  let lastSteps = -1

  try {
    for (;;) {
      const status = await uxJourneyAgentGet(jobId)
      const steps = status.result?.steps ?? []
      if (steps.length !== lastSteps) {
        lastSteps = steps.length
        yield {
          type: 'tool_progress',
          callId: input.callId,
          tool: 'inspect_website',
          message: stepMessage(status),
          jobId,
          stepCount: steps.length,
        }
      }

      if (status.status === 'complete' || status.status === 'error') {
        const success = Boolean(status.result?.success) && status.status === 'complete'
        const summary =
          status.result?.summary ||
          (success
            ? `Inspection of ${url} finished (${steps.length} steps).`
            : status.error || `Inspection ended with status ${status.status}`)

        await storeUpsertUxJourneyRun({
          personaId: input.personaId,
          jobId,
          task,
          siteUrl: url,
          success,
          stepsCount: steps.length,
          scorecard: (status.result?.scorecard as Record<string, unknown> | null) ?? null,
          steps,
          projectId: input.projectId ?? null,
        })

        yield {
          type: 'tool_complete',
          callId: input.callId,
          tool: 'inspect_website',
          summary,
          convert: {
            jobId,
            personaId: input.personaId,
            url,
            task,
            source: 'chat_inspect',
          },
          jobId,
          videoUrl: status.result?.videoUrl ?? null,
        }
        return
      }

      if (Date.now() - started > maxMs) {
        await uxJourneyAgentCancel(jobId, 'Hard timeout in Audion BFF')
        yield { type: 'error', message: 'UX journey agent poll timed out' }
        return
      }
      await sleep(intervalMs)
    }
  } catch (error) {
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'UX journey agent failed',
    }
  }
}

export function canRunLiveInspect(): boolean {
  return isUxJourneyAgentConfigured()
}
