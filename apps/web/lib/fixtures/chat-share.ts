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
  ChatUxJourneyStep,
} from '@audion-v3/contracts'
import { DEMO_PERSONAS } from './personas'
import { extractUrlFromMessage, buildInspectAgentTask } from '../chat/share'
import { inspectFromToolComplete } from '../chat/messages-column'

type PendingTool = ChatToolProposedEvent & {
  personaId: string
  projectId: string | null
  conversationId: string | null
  agentTask: string
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
  meta: {
    personaId: string
    projectId: string | null
    conversationId: string | null
    agentTask: string
  },
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

export async function* storeChatToolDecisionStream(
  callId: string,
  payload: ChatToolDecisionPayload,
): AsyncGenerator<ChatStreamEvent> {
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

  const stubSteps: ChatUxJourneyStep[] = [
    {
      step: 1,
      action: 'navigate',
      target: url,
      reasoning: `Opening **${url}** to scan the first screen.`,
      reasoningMeta: {
        evaluation_previous_goal: null,
        memory: 'Stub inspect — no live browser.',
        next_goal: 'Note primary CTA and navigation.',
      },
      result: 'Homepage loaded (stub).',
    },
    {
      step: 2,
      action: 'click',
      target: 'Primary CTA',
      reasoning: 'Following the **main call to action** for journey friction.',
      reasoningMeta: {
        evaluation_previous_goal: 'Landed on home.',
        memory: 'CTA above the fold looks dominant.',
        next_goal: 'Summarize inspect for convert.',
      },
      result: 'CTA interaction recorded (stub).',
    },
  ]
  const summary = `Stub inspection of ${url} finished. Ready to convert into a journey.`
  const convert = {
    jobId: `chat-inspect-${callId}`,
    personaId: tool.personaId,
    url,
    task: tool.agentTask || `Inspect ${url}`,
    source: 'chat_inspect' as const,
  }
  const personaPolicy = {
    dimensions: {
      risk_aversion: 0.72,
      time_pressure: 0.62,
      exploration: 0.45,
      detail_orientation: 0.88,
      trust_skepticism: 0.78,
      accessibility_need: 0.4,
    },
    heuristics: [
      'Prefer official navigation over ads',
      'Verify claims before committing',
      'Scan for specs and evidence trails',
    ],
  }
  if (tool.conversationId) {
    const { storeChatSetInspect } = await import('./chat-store')
    await storeChatSetInspect(
      tool.conversationId,
      inspectFromToolComplete({
        jobId: convert.jobId,
        summary,
        videoUrl: null,
        steps: stubSteps,
        stepsTotal: stubSteps.length,
        convert,
        personaPolicy,
      }),
    )
  }
  yield {
    type: 'tool_complete',
    callId,
    tool: tool.tool,
    summary,
    convert,
    jobId: convert.jobId,
    steps: stubSteps,
    stepsTotal: stubSteps.length,
    personaPolicy,
  }
}

/** Detect URL in user message → propose inspect_website. */
export function maybeProposeInspectWebsite(
  message: string,
  personaId: string,
  projectId: string | null,
  conversationId: string | null,
  contextMessages?: string[] | null,
): ChatToolProposedEvent | null {
  const url = extractUrlFromMessage(message)
  if (!url) return null
  const agentTask = buildInspectAgentTask(message, url, contextMessages)
  const goal = agentTask.includes('Aufgabe:')
    ? agentTask.split('Aufgabe:')[1]?.split('. Verfolge')[0]?.trim()
    : null
  const callId = `tool-${Date.now().toString(36)}`
  const event: ChatToolProposedEvent = {
    type: 'tool_proposed',
    callId,
    tool: 'inspect_website',
    title: 'Inspect website',
    detail: goal
      ? `${goal} — ${url}`
      : `Browse and summarize ${url} for journey signals.`,
    url,
    agentTask,
  }
  storeRegisterToolProposal(event, {
    personaId,
    projectId,
    conversationId,
    agentTask,
  })
  return event
}
