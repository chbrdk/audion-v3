/**
 * Conversation messages column: legacy ChatMessage[] or { messages, inspect }.
 */

import type {
  ChatConversationInspect,
  ChatMessage,
  ChatToolCompleteEvent,
  ChatUxJourneyStep,
} from '@audion-v3/contracts'

export type ChatMessagesColumn =
  | ChatMessage[]
  | {
      messages: ChatMessage[]
      inspect?: ChatConversationInspect | null
    }

export function parseChatMessagesColumn(raw: unknown): {
  messages: ChatMessage[]
  inspect: ChatConversationInspect | null
} {
  if (Array.isArray(raw)) {
    return { messages: raw as ChatMessage[], inspect: null }
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>
    const messages = Array.isArray(rec.messages) ? (rec.messages as ChatMessage[]) : []
    const inspect = normalizeInspect(rec.inspect)
    return { messages, inspect }
  }
  return { messages: [], inspect: null }
}

export function serializeChatMessagesColumn(
  messages: ChatMessage[],
  inspect: ChatConversationInspect | null,
): ChatMessagesColumn {
  return { messages, inspect }
}

export function inspectFromToolComplete(input: {
  jobId?: string | null
  summary: string
  videoUrl?: string | null
  steps?: ChatUxJourneyStep[] | null
  stepsTotal?: number | null
  convert: ChatConversationInspect['convert']
}): ChatConversationInspect {
  const steps = Array.isArray(input.steps) ? input.steps : []
  return {
    jobId: input.jobId ?? null,
    summary: input.summary,
    videoUrl: input.videoUrl ?? null,
    steps,
    stepsTotal: input.stepsTotal ?? steps.length,
    convert: input.convert,
    completedAt: new Date().toISOString(),
  }
}

/** Rebuild a tool_complete event for UI restore from persisted inspect. */
export function toolCompleteFromInspect(inspect: ChatConversationInspect): ChatToolCompleteEvent {
  return {
    type: 'tool_complete',
    callId: 'restored',
    tool: 'inspect_website',
    summary: inspect.summary || 'Inspection finished.',
    convert: inspect.convert,
    jobId: inspect.jobId,
    videoUrl: inspect.videoUrl,
    steps: inspect.steps,
    stepsTotal: inspect.stepsTotal,
  }
}

function normalizeInspect(raw: unknown): ChatConversationInspect | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const steps = Array.isArray(rec.steps) ? (rec.steps as ChatUxJourneyStep[]) : []
  const convert =
    rec.convert && typeof rec.convert === 'object'
      ? (rec.convert as ChatConversationInspect['convert'])
      : null
  return {
    jobId: typeof rec.jobId === 'string' ? rec.jobId : null,
    summary: typeof rec.summary === 'string' ? rec.summary : null,
    videoUrl: typeof rec.videoUrl === 'string' ? rec.videoUrl : null,
    steps,
    stepsTotal: typeof rec.stepsTotal === 'number' ? rec.stepsTotal : steps.length,
    convert,
    completedAt: typeof rec.completedAt === 'string' ? rec.completedAt : null,
  }
}
