/**
 * Orchestrate chat inspect_website against the V3 UX Journey Agent.
 */

import type { ChatStreamEvent } from '@audion-v3/contracts'
import { storePersonaDetail } from '../fixtures/persona-store'
import { storeUpsertUxJourneyRun } from '../fixtures/ux-journey-run-store'
import { inspectFromToolComplete } from './messages-column'
import {
  isUxJourneyAgentConfigured,
  sleep,
  uxJourneyAgentCancel,
  uxJourneyAgentGet,
  uxJourneyAgentStart,
  type UxJourneyAgentJobStatus,
} from '../ux-journey-agent-client'
import { bffVideoUrlForJob, toChatUxJourneySteps } from './ux-journey-steps'

function stepMessage(status: UxJourneyAgentJobStatus): string {
  if (status.status === 'error') {
    const detail = (status.error || '').trim()
    return detail ? `Agent failed: ${detail}` : 'Agent failed (no error detail from service)'
  }
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

function stepsFingerprint(status: UxJourneyAgentJobStatus): string {
  const steps = status.result?.steps ?? []
  const last = steps[steps.length - 1]
  const meta = last?.reasoningMeta
  return [
    status.status,
    steps.length,
    last?.step,
    last?.action,
    last?.screenshotUrl ?? '',
    (last?.reasoning || '').slice(0, 80),
    (meta?.memory || '').slice(0, 40),
    (meta?.next_goal || '').slice(0, 40),
    (meta?.evaluation_previous_goal || '').slice(0, 40),
  ].join('|')
}

export async function* runLiveInspectWebsiteStream(input: {
  callId: string
  url: string
  personaId: string
  projectId?: string | null
  conversationId?: string | null
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
    status: 'running',
    steps: [],
    stepCount: 0,
  }

  const intervalMs = 1500
  const maxMs = 15 * 60 * 1000
  const started = Date.now()
  let lastFp = ''

  try {
    for (;;) {
      const status = await uxJourneyAgentGet(jobId)
      const steps = status.result?.steps ?? []
      const chatSteps = toChatUxJourneySteps(steps)
      const fp = stepsFingerprint(status)
      if (fp !== lastFp) {
        lastFp = fp
        yield {
          type: 'tool_progress',
          callId: input.callId,
          tool: 'inspect_website',
          message: stepMessage(status),
          jobId,
          status: status.status,
          stepCount: chatSteps.length,
          stepsTotal: chatSteps.length,
          steps: chatSteps,
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

        if (!success) {
          yield {
            type: 'error',
            message: `UX journey agent failed: ${summary}`,
          }
          return
        }

        const convert = {
          jobId,
          personaId: input.personaId,
          url,
          task,
          source: 'chat_inspect' as const,
        }
        const videoUrl = bffVideoUrlForJob(jobId, status.result?.videoUrl)
        if (input.conversationId) {
          const { storeChatSetInspect } = await import('../fixtures/chat-store')
          await storeChatSetInspect(
            input.conversationId,
            inspectFromToolComplete({
              jobId,
              summary,
              videoUrl,
              steps: chatSteps,
              stepsTotal: chatSteps.length,
              convert,
            }),
          )
        }

        yield {
          type: 'tool_complete',
          callId: input.callId,
          tool: 'inspect_website',
          summary,
          convert,
          jobId,
          videoUrl,
          steps: chatSteps,
          stepsTotal: chatSteps.length,
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
