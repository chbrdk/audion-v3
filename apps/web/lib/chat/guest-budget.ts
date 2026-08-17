/**
 * Guest / public embed chat budgets — server-enforced.
 * Spec: specs/domain/chat-embed.md · knowledge/paths.md
 */

export const GUEST_CHAT_MAX_USER_TURNS = 5
export const GUEST_CHAT_MAX_CHARS = 800
export const GUEST_CHAT_TTL_MS = 30 * 60 * 1000
export const GUEST_CHAT_COOKIE = 'audion_guest_chat'

export const GUEST_BUDGET_CODE = {
  EXHAUSTED: 'GUEST_BUDGET_EXHAUSTED',
  MESSAGE_TOO_LONG: 'GUEST_MESSAGE_TOO_LONG',
  SESSION_EXPIRED: 'GUEST_SESSION_EXPIRED',
} as const

export type GuestBudgetCode = (typeof GUEST_BUDGET_CODE)[keyof typeof GUEST_BUDGET_CODE]

export type GuestBudgetState = {
  turns: number
  startedAt: number
}

type GuestBudgetStore = Map<string, GuestBudgetState>

const globalStore = globalThis as typeof globalThis & {
  __audionGuestChatBudget?: GuestBudgetStore
}

function store(): GuestBudgetStore {
  if (!globalStore.__audionGuestChatBudget) {
    globalStore.__audionGuestChatBudget = new Map()
  }
  return globalStore.__audionGuestChatBudget
}

export function guestBudgetKey(sessionId: string, personaId: string, projectId: string): string {
  return `${sessionId.trim()}:${personaId.trim()}:${projectId.trim()}`
}

export function createGuestSessionId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getGuestBudgetState(key: string): GuestBudgetState {
  return store().get(key) ?? { turns: 0, startedAt: Date.now() }
}

export function remainingGuestTurns(state: GuestBudgetState): number {
  return Math.max(0, GUEST_CHAT_MAX_USER_TURNS - state.turns)
}

export type GuestBudgetCheckResult =
  | { ok: true; state: GuestBudgetState; remaining: number }
  | { ok: false; code: GuestBudgetCode; message: string; status: number; remaining: number }

/** Pre-flight before streaming a guest user turn. Does not mutate. */
export function checkGuestBudget(input: {
  state: GuestBudgetState
  message: string
  now?: number
}): GuestBudgetCheckResult {
  const now = input.now ?? Date.now()
  const remaining = remainingGuestTurns(input.state)

  if (now - input.state.startedAt > GUEST_CHAT_TTL_MS) {
    return {
      ok: false,
      code: GUEST_BUDGET_CODE.SESSION_EXPIRED,
      message: 'Guest chat session expired. Open the link again to start a new short session.',
      status: 403,
      remaining: 0,
    }
  }

  const chars = input.message.trim().length
  if (chars > GUEST_CHAT_MAX_CHARS) {
    return {
      ok: false,
      code: GUEST_BUDGET_CODE.MESSAGE_TOO_LONG,
      message: `Message is too long (max ${GUEST_CHAT_MAX_CHARS} characters for guest chat).`,
      status: 400,
      remaining,
    }
  }

  if (input.state.turns >= GUEST_CHAT_MAX_USER_TURNS) {
    return {
      ok: false,
      code: GUEST_BUDGET_CODE.EXHAUSTED,
      message: `Guest chat limit reached (${GUEST_CHAT_MAX_USER_TURNS} messages). Open in Audion for a full session.`,
      status: 429,
      remaining: 0,
    }
  }

  return { ok: true, state: input.state, remaining }
}

/** Record a successful guest user turn. */
export function consumeGuestTurn(key: string, now = Date.now()): GuestBudgetState {
  const prev = store().get(key)
  const next: GuestBudgetState = prev
    ? { turns: prev.turns + 1, startedAt: prev.startedAt }
    : { turns: 1, startedAt: now }
  store().set(key, next)
  return next
}

/** Test helper — clear in-memory guest budgets. */
export function resetGuestBudgetStoreForTests(): void {
  store().clear()
}
