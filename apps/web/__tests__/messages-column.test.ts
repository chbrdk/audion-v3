import { describe, expect, it } from 'vitest'
import {
  inspectFromToolComplete,
  parseChatMessagesColumn,
  serializeChatMessagesColumn,
  toolCompleteFromInspect,
} from '../lib/chat/messages-column'

describe('chat messages column', () => {
  it('parses legacy message arrays without inspect', () => {
    const messages = [
      {
        id: 'm1',
        role: 'user' as const,
        content: 'hi',
        createdAt: null,
        status: 'complete' as const,
      },
    ]
    expect(parseChatMessagesColumn(messages)).toEqual({ messages, inspect: null })
  })

  it('round-trips messages + inspect envelope', () => {
    const messages = [
      {
        id: 'm1',
        role: 'user' as const,
        content: 'inspect',
        createdAt: null,
        status: 'complete' as const,
      },
    ]
    const inspect = inspectFromToolComplete({
      jobId: 'job-1',
      summary: 'Done',
      steps: [{ step: 1, action: 'navigate', reasoning: 'Open **home**' }],
      stepsTotal: 1,
      convert: {
        jobId: 'job-1',
        personaId: 'p1',
        url: 'https://example.com',
        task: 'Inspect',
        source: 'chat_inspect',
      },
    })
    const column = serializeChatMessagesColumn(messages, inspect)
    const parsed = parseChatMessagesColumn(column)
    expect(parsed.messages).toEqual(messages)
    expect(parsed.inspect?.jobId).toBe('job-1')
    expect(parsed.inspect?.steps[0]?.reasoning).toContain('**home**')
    expect(toolCompleteFromInspect(parsed.inspect!).type).toBe('tool_complete')
  })
})
