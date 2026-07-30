import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetChatStore } from '../lib/fixtures/chat-store'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { nativeChatStreamEvents } from '../lib/chat/native-stream'

const createMock = vi.fn()

vi.mock('../lib/ai/client', () => ({
  createOpenAiClient: () => ({
    chat: { completions: { create: createMock } },
  }),
  getAiOpenAiModel: () => 'gpt-test',
  toAiNativeError: (error: unknown, fallback: string) => ({
    error: fallback,
    status: 502,
    detail: error instanceof Error ? error.message : String(error),
  }),
}))

async function* fakeChunks() {
  yield { choices: [{ delta: { content: 'Hello ' } }] }
  yield { choices: [{ delta: { content: 'world' } }] }
}

describe('native chat stream', () => {
  beforeEach(() => {
    resetChatStore()
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    createMock.mockReset()
    createMock.mockResolvedValue(fakeChunks())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('emits deltas and done', async () => {
    const events = []
    for await (const event of nativeChatStreamEvents({
      personaId: DEMO_PERSONAS[0]!.id,
      message: 'What matters?',
    })) {
      events.push(event)
    }
    expect(events.some((e) => e.type === 'delta' && e.text === 'Hello ')).toBe(true)
    expect(events.some((e) => e.type === 'delta' && e.text === 'world')).toBe(true)
    const done = events.find((e) => e.type === 'done')
    expect(done?.type).toBe('done')
    if (done?.type === 'done') {
      expect(done.conversationId).toBeTruthy()
    }
  })
})
