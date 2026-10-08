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
    expect(parseChatMessagesColumn(messages)).toEqual({
      messages,
      inspect: null,
      behavioralSession: null,
    })
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
    const behavioralSession = {
      surface: 'chat' as const,
      frustrationLoad: 0.4,
      clarity: 2,
      fatigue: 0.1,
      tryBudgetRemaining: 3,
      lookBeforeActSatisfied: true,
      stance: 'hesitate' as const,
      turnIndex: 2,
      episodic: [],
      policyId: 'abc123',
    }
    const column = serializeChatMessagesColumn(messages, inspect, behavioralSession)
    const parsed = parseChatMessagesColumn(column)
    expect(parsed.messages).toEqual(messages)
    expect(parsed.inspect?.jobId).toBe('job-1')
    expect(parsed.inspect?.steps[0]?.reasoning).toContain('**home**')
    expect(parsed.behavioralSession?.stance).toBe('hesitate')
    expect(toolCompleteFromInspect(parsed.inspect!).type).toBe('tool_complete')
  })
})
