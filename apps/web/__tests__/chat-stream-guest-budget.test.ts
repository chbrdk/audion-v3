import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ChatSendPayload } from '@audion-v3/contracts'
import {
  GUEST_BUDGET_CODE,
  GUEST_CHAT_MAX_USER_TURNS,
  resetGuestBudgetStoreForTests,
} from '../lib/chat/guest-budget'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/runtime-config', () => ({
  shouldUseChatFixtures: () => true,
  shouldPreferChatLive: () => false,
  shouldRequireChatLive: () => false,
}))

vi.mock('../lib/usage-report', () => ({
  reportUsage: vi.fn(),
}))

describe('POST /api/chat/stream guest budget', () => {
  beforeEach(() => {
    resetGuestBudgetStoreForTests()
    vi.resetModules()
  })

  it('rejects after guest turn cap', async () => {
    const { POST } = await import('../app/api/chat/stream/route')
    const body: ChatSendPayload = {
      personaId: 'persona-a',
      projectId: 'proj-a',
      message: 'hello',
      guestSessionId: 'guest-test-1',
    }

    for (let i = 0; i < GUEST_CHAT_MAX_USER_TURNS; i++) {
      const res = await POST(
        new Request('http://localhost/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      )
      expect(res.status).toBe(200)
    }

    const blocked = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    expect(blocked.status).toBe(429)
    const json = (await blocked.json()) as { code?: string }
    expect(json.code).toBe(GUEST_BUDGET_CODE.EXHAUSTED)
  })

  it('requires projectId for guest streams', async () => {
    const { POST } = await import('../app/api/chat/stream/route')
    const res = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: 'persona-a',
          message: 'hello',
          guestSessionId: 'guest-test-2',
        } satisfies ChatSendPayload),
      }),
    )
    expect(res.status).toBe(400)
  })
})
