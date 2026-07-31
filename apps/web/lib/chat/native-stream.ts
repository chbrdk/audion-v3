/**
 * Native chat NDJSON stream — OpenAI completions → V3 ChatStreamEvent.
 */

import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts'
import { createOpenAiClient, getAiOpenAiModel, toAiNativeError } from '../ai/client'
import {
  storeChatAppendAssistant,
  storeChatBeginUserTurn,
  storeChatConversationDetail,
} from '../fixtures/chat-store'
import { maybeProposeInspectWebsite } from '../fixtures/chat-share'
import { extractUrlFromMessage } from './share'
import { resolvePersonaSystemPrompt } from '../fixtures/persona-prompts-store'

const HISTORY_MESSAGE_LIMIT = 12

async function systemPromptForPersona(personaId: string, message: string): Promise<string> {
  const base = await resolvePersonaSystemPrompt(personaId)
  const url = extractUrlFromMessage(message)
  if (!url) return base
  return `${base}

AUDION TOOLING:
The user mentioned ${url}. A real browser inspect tool (inspect_website) will be offered after your reply.
Do not say you cannot open or fetch websites. Keep your answer short: acknowledge the URL and that they can Approve the inspect card to walk the site as you.`
}

type OpenAiChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function buildOpenAiMessages(
  personaId: string,
  conversationId: string,
  currentMessage: string,
): Promise<OpenAiChatMessage[]> {
  const system: OpenAiChatMessage = {
    role: 'system',
    content: await systemPromptForPersona(personaId, currentMessage),
  }
  const detail = await storeChatConversationDetail(conversationId)
  const recent = (detail?.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-HISTORY_MESSAGE_LIMIT)
  // Prefer the just-persisted window; ensure the trailing user turn matches the
  // request payload (may include step-context enrichment).
  const history: OpenAiChatMessage[] = recent.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))
  if (!history.length || history[history.length - 1]?.role !== 'user') {
    history.push({ role: 'user', content: currentMessage })
  } else {
    history[history.length - 1] = { role: 'user', content: currentMessage }
  }
  return [system, ...history]
}

/** Async generator of NDJSON chat events for native OpenAI streaming. */
export async function* nativeChatStreamEvents(
  payload: ChatSendPayload,
): AsyncGenerator<ChatStreamEvent> {
  const message = payload.message.trim()
  if (!message) {
    yield { type: 'error', message: 'Message is required' }
    return
  }
  if (!payload.personaId.trim()) {
    yield { type: 'error', message: 'personaId is required' }
    return
  }

  const turn = await storeChatBeginUserTurn(payload)
  if ('error' in turn) {
    yield { type: 'error', message: turn.error }
    return
  }

  try {
    const client = createOpenAiClient()
    const stream = await client.chat.completions.create({
      model: getAiOpenAiModel(),
      stream: true,
      messages: await buildOpenAiMessages(payload.personaId, turn.conversationId, message),
      temperature: 0.7,
    })

    let full = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) {
        full += text
        yield { type: 'delta', text }
      }
    }

    const proposal = maybeProposeInspectWebsite(
      message,
      payload.personaId,
      payload.projectId ?? null,
      turn.conversationId,
    )
    if (proposal) yield proposal

    const done = await storeChatAppendAssistant(turn.conversationId, full || '…')
    yield {
      type: 'done',
      conversationId: done.conversationId,
      messageId: done.messageId,
    }
  } catch (error) {
    const err = toAiNativeError(error, 'Chat stream failed')
    yield { type: 'error', message: err.detail || err.error }
  }
}

export function nativeChatNdjsonResponse(payload: ChatSendPayload): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of nativeChatStreamEvents(payload)) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'stream failed'
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ type: 'error', message })}\n`),
        )
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
