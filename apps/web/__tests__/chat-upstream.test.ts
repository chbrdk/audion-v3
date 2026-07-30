import { describe, expect, it } from 'vitest'
import {
  mapUpstreamSseJson,
  toUpstreamChatBody,
} from '../lib/chat/upstream-stream'

describe('chat upstream adapters', () => {
  it('maps V3 payload to chat-api snake_case body', () => {
    expect(
      toUpstreamChatBody({
        personaId: 'persona-1',
        message: 'Hello',
        conversationId: 'conv-9',
      }),
    ).toEqual({
      persona_id: 'persona-1',
      message: 'Hello',
      session_id: 'conv-9',
    })
  })

  it('maps SSE delta payloads to V3 text deltas', () => {
    expect(mapUpstreamSseJson({ type: 'delta', delta: 'Hi' })).toEqual([
      { type: 'delta', text: 'Hi' },
    ])
    expect(mapUpstreamSseJson({ type: 'delta', text: 'Yo' })).toEqual([
      { type: 'delta', text: 'Yo' },
    ])
    expect(mapUpstreamSseJson({ type: 'reasoning_delta', delta: 'think' })).toEqual([])
  })

  it('maps done and error events', () => {
    expect(mapUpstreamSseJson({ type: 'done', conversation_id: 'c1' })).toEqual([
      { type: 'done', conversationId: 'c1', messageId: undefined },
    ])
    expect(mapUpstreamSseJson({ type: 'error', detail: 'boom' })).toEqual([
      { type: 'error', message: 'boom' },
    ])
  })
})
