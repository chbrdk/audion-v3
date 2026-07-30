/**
 * Native chat NDJSON stream — OpenAI completions → V3 ChatStreamEvent.
 */

import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts'
import { createOpenAiClient, getAiOpenAiModel, toAiNativeError } from '../ai/client'
import { storePersonaDetail } from '../fixtures/persona-store'
import {
  storeChatAppendAssistant,
  storeChatBeginUserTurn,
} from '../fixtures/chat-store'
import { maybeProposeInspectWebsite } from '../fixtures/chat-share'

function systemPromptForPersona(personaId: string): string {
  const persona = storePersonaDetail(personaId)
  if (!persona) {
    return 'You are a helpful audience research assistant speaking as a persona.'
  }
  return [
    `You are ${persona.name}, ${persona.role}.`,
    persona.bio ? `Bio: ${persona.bio}` : '',
    persona.archetype ? `Archetype: ${persona.archetype}` : '',
    `Interests: ${persona.interests.join(', ') || 'n/a'}`,
    `Values: ${persona.values.join(', ') || 'n/a'}`,
    'Answer in first person as this persona. Be concrete, magazine-brief, and evidence-minded.',
    'Use short markdown (## headings, lists) when helpful.',
  ]
    .filter(Boolean)
    .join('\n')
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

  const turn = storeChatBeginUserTurn(payload)
  if ('error' in turn) {
    yield { type: 'error', message: turn.error }
    return
  }

  try {
    const client = createOpenAiClient()
    const stream = await client.chat.completions.create({
      model: getAiOpenAiModel(),
      stream: true,
      messages: [
        { role: 'system', content: systemPromptForPersona(payload.personaId) },
        { role: 'user', content: message },
      ],
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

    const done = storeChatAppendAssistant(turn.conversationId, full || '…')
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
