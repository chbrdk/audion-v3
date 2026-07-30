/**
 * Map V3 chat payload ↔ V2 chat-api request/stream formats.
 * V2 streams SSE (`data: {type,delta}`); V3 UI expects NDJSON (`{type,text}`).
 */

import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts'

/** Body for POST /chat/message/stream on AUDION-v2 chat-api. */
export function toUpstreamChatBody(payload: ChatSendPayload): Record<string, unknown> {
  return {
    persona_id: payload.personaId,
    message: payload.message,
    session_id: payload.conversationId ?? undefined,
  }
}

/**
 * Convert one SSE JSON payload from chat-api into V3 ChatStreamEvent(s).
 * Upstream uses `delta` for text chunks; V3 uses `text`.
 */
export function mapUpstreamSseJson(raw: unknown): ChatStreamEvent[] {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (!rec || typeof rec.type !== 'string') return []

  if (rec.type === 'delta') {
    const text =
      typeof rec.text === 'string'
        ? rec.text
        : typeof rec.delta === 'string'
          ? rec.delta
          : typeof rec.delta === 'object' &&
              rec.delta &&
              typeof (rec.delta as { text?: unknown }).text === 'string'
            ? String((rec.delta as { text: string }).text)
            : ''
    if (!text) return []
    return [{ type: 'delta', text }]
  }

  if (rec.type === 'done' || rec.type === 'complete' || rec.type === 'end') {
    const conversationId = String(
      rec.conversation_id ?? rec.conversationId ?? rec.session_id ?? 'live',
    )
    return [
      {
        type: 'done',
        conversationId,
        messageId: typeof rec.message_id === 'string' ? rec.message_id : undefined,
      },
    ]
  }

  if (rec.type === 'error') {
    return [
      {
        type: 'error',
        message: String(rec.message ?? rec.error ?? rec.detail ?? 'Chat upstream error'),
      },
    ]
  }

  // Ignore reasoning_delta and other lifecycle events for magazine MVP.
  return []
}

/**
 * Transform an SSE byte stream into NDJSON ChatStreamEvent lines for the V3 client.
 */
export function sseToNdjsonTransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let emittedDone = false

  const flushEvents = (
    controller: TransformStreamDefaultController<Uint8Array>,
    events: ChatStreamEvent[],
  ) => {
    for (const event of events) {
      if (event.type === 'done') emittedDone = true
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
    }
  }

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''
      let dataLines: string[] = []
      const flushBlock = () => {
        if (!dataLines.length) return
        const payload = dataLines.join('\n')
        dataLines = []
        if (payload === '[DONE]') {
          if (!emittedDone) {
            flushEvents(controller, [{ type: 'done', conversationId: 'live' }])
          }
          return
        }
        try {
          flushEvents(controller, mapUpstreamSseJson(JSON.parse(payload)))
        } catch {
          /* skip malformed */
        }
      }
      for (const line of parts) {
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        } else if (line.trim() === '') {
          flushBlock()
        }
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        const line = buffer.trim()
        if (line.startsWith('data:')) {
          try {
            flushEvents(controller, mapUpstreamSseJson(JSON.parse(line.slice(5).trim())))
          } catch {
            /* ignore */
          }
        }
      }
      if (!emittedDone) {
        flushEvents(controller, [{ type: 'done', conversationId: 'live' }])
      }
    },
  })
}
