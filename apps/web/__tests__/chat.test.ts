import { describe, expect, it } from 'vitest'
import {
  normalizeChatMarkdown,
  parseChatBlocks,
  parseChatInlines,
} from '../lib/chat/format-chat-answer'
import { resetChatStore, storeChatFakeStream, storeChatConversationList } from '../lib/fixtures/chat-store'

describe('chat answer formatting', () => {
  it('parses headings, lists, and inline marks', () => {
    const blocks = parseChatBlocks('## Lead\n\n**Bold** and *em*\n\n1. One\n2. Two\n\n- A\n- B')
    expect(blocks[0]).toMatchObject({ type: 'h', level: 2 })
    expect(parseChatInlines('see [1] and [2]').some((s) => s.type === 'cite')).toBe(true)
    expect(normalizeChatMarkdown('**Title:** body').startsWith('## Title')).toBe(true)
  })
})

describe('chat fixture stream', () => {
  it('emits deltas and done for a valid send', async () => {
    resetChatStore()
    const events = []
    for await (const event of storeChatFakeStream({
      personaId: 'persona-alex-morgan',
      message: 'Hello persona',
    })) {
      events.push(event)
    }
    expect(events.some((e) => e.type === 'delta')).toBe(true)
    const done = events.find((e) => e.type === 'done')
    expect(done?.type).toBe('done')
    if (done?.type === 'done') {
      expect(done.conversationId).toBeTruthy()
    }
    expect((await storeChatConversationList()).total).toBeGreaterThanOrEqual(1)
  })

  it('errors when message is empty', async () => {
    const events = []
    for await (const event of storeChatFakeStream({
      personaId: 'persona-alex-morgan',
      message: '  ',
    })) {
      events.push(event)
    }
    expect(events[0]).toEqual({ type: 'error', message: 'Message or attachment is required' })
  })
})
