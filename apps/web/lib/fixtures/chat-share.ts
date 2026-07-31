/**
 * Chat share + tool-call decision fixtures.
 * Spec: knowledge/chat-modalities-2026.md
 */

import type {
  ChatShareMoodboard,
  ChatSharePersona,
  ChatStreamEvent,
  ChatToolDecisionPayload,
  ChatToolProposedEvent,
} from '@audion-v3/contracts'
import { DEMO_PERSONAS } from './personas'
import { extractUrlFromMessage } from '../chat/share'

type PendingTool = ChatToolProposedEvent & {
  personaId: string
  projectId: string | null
  conversationId: string | null
}

const pending = new Map<string, PendingTool>()

export function resetChatToolStore(): void {
  pending.clear()
}

export function storeSharePersona(
  personaId: string,
  projectId: string | null,
): ChatSharePersona | { error: string; status: number } {
  const persona = DEMO_PERSONAS.find((p) => p.id === personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  if (projectId && persona.projectId && persona.projectId !== projectId) {
    return { error: 'Share token does not match persona project', status: 403 }
  }
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    projectId: persona.projectId,
    avatarUrl: persona.avatarUrl,
    bio: persona.bio,
  }
}

export function storeShareMoodboard(
  personaId: string,
  projectId: string | null,
): ChatShareMoodboard | { error: string; status: number } {
  const persona = DEMO_PERSONAS.find((p) => p.id === personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  if (projectId && persona.projectId && persona.projectId !== projectId) {
    return { error: 'Share token does not match persona project', status: 403 }
  }
  const visuals = persona.visuals
  return {
    personaId: persona.id,
    projectId: persona.projectId,
    styleKeywords: visuals?.styleKeywords ?? [],
    tiles: (visuals?.tiles ?? []).map((t) => ({
      id: t.id,
      imageUrl: t.imageUrl,
      category: t.category,
      caption: t.caption,
    })),
  }
}

export function storeRegisterToolProposal(
  event: ChatToolProposedEvent,
  meta: { personaId: string; projectId: string | null; conversationId: string | null },
): void {
  pending.set(event.callId, { ...event, ...meta })
}

export function storePeekToolProposal(callId: string): PendingTool | null {
  return pending.get(callId) ?? null
}

export function storeConsumeToolProposal(callId: string): PendingTool | null {
  const tool = pending.get(callId) ?? null
  if (tool) pending.delete(callId)
  return tool
}

export function* storeChatToolDecisionStream(
  callId: string,
  payload: ChatToolDecisionPayload,
): Generator<ChatStreamEvent> {
  const tool = pending.get(callId)
  if (!tool) {
    yield { type: 'error', message: 'Unknown tool call' }
    return
  }
  pending.delete(callId)

  if (payload.decision === 'deny') {
    yield {
      type: 'tool_denied',
      callId,
      tool: tool.tool,
      message: 'Inspection cancelled.',
    }
    return
  }

  const url = tool.url || 'https://example.com'
  yield {
    type: 'tool_started',
    callId,
    tool: tool.tool,
    message: `Inspecting ${url}…`,
  }
  yield {
    type: 'tool_progress',
    callId,
    tool: tool.tool,
    message: 'Capturing structure and key journeys…',
  }
  yield {
    type: 'tool_complete',
    callId,
    tool: tool.tool,
    summary: `Stub inspection of ${url} finished. Ready to convert into a journey.`,
    convert: {
      jobId: `chat-inspect-${callId}`,
      personaId: tool.personaId,
      url,
      task: `Inspect ${url}`,
      source: 'chat_inspect',
    },
  }
}

/** Detect URL in user message → propose inspect_website. */
export function maybeProposeInspectWebsite(
  message: string,
  personaId: string,
  projectId: string | null,
  conversationId: string | null,
): ChatToolProposedEvent | null {
  const url = extractUrlFromMessage(message)
  if (!url) return null
  const callId = `tool-${Date.now().toString(36)}`
  const event: ChatToolProposedEvent = {
    type: 'tool_proposed',
    callId,
    tool: 'inspect_website',
    title: 'Inspect website',
    detail: `Browse and summarize ${url} for journey signals.`,
    url,
  }
  storeRegisterToolProposal(event, { personaId, projectId, conversationId })
  return event
}
