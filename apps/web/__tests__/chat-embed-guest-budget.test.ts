import { describe, expect, it, beforeEach } from 'vitest'
import {
  checkGuestBudget,
  consumeGuestTurn,
  GUEST_BUDGET_CODE,
  GUEST_CHAT_MAX_CHARS,
  GUEST_CHAT_MAX_USER_TURNS,
  GUEST_CHAT_TTL_MS,
  guestBudgetKey,
  remainingGuestTurns,
  resetGuestBudgetStoreForTests,
} from '../lib/chat/guest-budget'
import { buildChatEmbedHref } from '../lib/chat/share'
import { resolveChatEmbedFrameAncestors } from '../lib/chat/embed-frame-ancestors'
import { paths } from '../lib/paths'

describe('buildChatEmbedHref', () => {
  it('builds /chat/embed with persona, project, embed marker', () => {
    expect(buildChatEmbedHref({ personaId: 'p1', projectId: 'proj-1' })).toBe(
      '/chat/embed?personaId=p1&projectId=proj-1&embed=1',
    )
  })

  it('includes optional theme', () => {
    expect(
      buildChatEmbedHref({ personaId: 'p1', projectId: 'proj-1', theme: 'dark' }),
    ).toContain('theme=dark')
  })

  it('is registered on paths.routes.chatEmbed', () => {
    expect(paths.routes.chatEmbedPath).toBe('/chat/embed')
    expect(paths.routes.chatEmbed({ personaId: 'a', projectId: 'b' })).toContain('/chat/embed?')
  })
})

describe('resolveChatEmbedFrameAncestors', () => {
  it('prefers explicit AUDION_CHAT_EMBED_FRAME_ANCESTORS', () => {
    expect(
      resolveChatEmbedFrameAncestors({
        [paths.envChatEmbedFrameAncestors]: 'https://plexon.example https://other.example',
      } as NodeJS.ProcessEnv),
    ).toBe('https://plexon.example https://other.example')
  })

  it('derives from NEXT_PUBLIC_PLEXON_URL origin', () => {
    expect(
      resolveChatEmbedFrameAncestors({
        [paths.envPlexonPublicUrl]: 'https://plexon-v3.projects-a.plygrnd.tech/app',
      } as NodeJS.ProcessEnv),
    ).toBe('https://plexon-v3.projects-a.plygrnd.tech')
  })

  it('falls back to self when unset', () => {
    expect(resolveChatEmbedFrameAncestors({} as NodeJS.ProcessEnv)).toBe("'self'")
  })
})

describe('guest budget', () => {
  beforeEach(() => {
    resetGuestBudgetStoreForTests()
  })

  it('allows turns under the cap', () => {
    const check = checkGuestBudget({
      state: { turns: 0, startedAt: Date.now() },
      message: 'hello',
    })
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.remaining).toBe(GUEST_CHAT_MAX_USER_TURNS)
  })

  it('rejects message over char limit', () => {
    const check = checkGuestBudget({
      state: { turns: 0, startedAt: Date.now() },
      message: 'x'.repeat(GUEST_CHAT_MAX_CHARS + 1),
    })
    expect(check.ok).toBe(false)
    if (!check.ok) {
      expect(check.code).toBe(GUEST_BUDGET_CODE.MESSAGE_TOO_LONG)
      expect(check.status).toBe(400)
    }
  })

  it('rejects after max turns', () => {
    const check = checkGuestBudget({
      state: { turns: GUEST_CHAT_MAX_USER_TURNS, startedAt: Date.now() },
      message: 'one more',
    })
    expect(check.ok).toBe(false)
    if (!check.ok) {
      expect(check.code).toBe(GUEST_BUDGET_CODE.EXHAUSTED)
      expect(check.status).toBe(429)
    }
  })

  it('rejects expired sessions', () => {
    const check = checkGuestBudget({
      state: { turns: 1, startedAt: Date.now() - GUEST_CHAT_TTL_MS - 1 },
      message: 'late',
      now: Date.now(),
    })
    expect(check.ok).toBe(false)
    if (!check.ok) {
      expect(check.code).toBe(GUEST_BUDGET_CODE.SESSION_EXPIRED)
      expect(check.status).toBe(403)
    }
  })

  it('consumes turns per session key', () => {
    const key = guestBudgetKey('sess-1', 'persona-a', 'proj-a')
    consumeGuestTurn(key)
    consumeGuestTurn(key)
    expect(remainingGuestTurns({ turns: 2, startedAt: Date.now() })).toBe(
      GUEST_CHAT_MAX_USER_TURNS - 2,
    )
  })
})
