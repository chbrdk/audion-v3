/**
 * Chat conversation behavioral session FSM (Phase 3).
 * Process-local store — survives turns within an instance; not cross-replica yet.
 * Spec: specs/domain/behavioral-controller.md
 */

import type { BehavioralPolicy, BehavioralSessionState } from '@audion-v3/contracts'
import {
  storeChatConversationDetail,
  storeChatSetBehavioralSession,
} from '../fixtures/chat-store'
import {
  initBehavioralSessionState,
  tickFrustration,
} from './compile-behavioral-policy'
import { resolvePersonaChatMaxTokens } from './chat-adapter'
import { observationFromSession } from './gold-scoreboard'
import { recordBehavioralGoldObservation } from './gold-store'
import { mirrorPersonaAffect, readPersonaAffect } from './persona-affect-mirror'

export const BEHAVIORAL_LIVE_SESSION_HEADING = '## Live session state'

type Store = {
  byConversationId: Map<string, BehavioralSessionState>
}

const g = globalThis as unknown as { __audionChatBehavioralSessions?: Store }

function store(): Store {
  if (!g.__audionChatBehavioralSessions) {
    g.__audionChatBehavioralSessions = { byConversationId: new Map() }
  }
  return g.__audionChatBehavioralSessions
}

export function resetChatBehavioralSessions(): void {
  store().byConversationId.clear()
}

export function getChatBehavioralSession(
  conversationId: string,
): BehavioralSessionState | null {
  return store().byConversationId.get(conversationId) ?? null
}

export function getOrInitChatBehavioralSession(
  conversationId: string,
  policy: BehavioralPolicy,
): BehavioralSessionState {
  const existing = store().byConversationId.get(conversationId)
  if (existing && existing.policyId === policy.policyId) return existing
  const fresh = initBehavioralSessionState(policy, 'chat')
  // Chat starts ready to talk (not look-before-act hesitate).
  fresh.stance = 'proceed'
  store().byConversationId.set(conversationId, fresh)
  return fresh
}

export function saveChatBehavioralSession(
  conversationId: string,
  state: BehavioralSessionState,
): void {
  store().byConversationId.set(conversationId, state)
}

/**
 * Load durable session (messages jsonb) → memory, or init.
 * Seeds from persona affect mirror when starting a new thread mid-mood.
 */
export async function loadOrInitChatBehavioralSession(
  conversationId: string,
  policy: BehavioralPolicy,
  personaId?: string | null,
): Promise<BehavioralSessionState> {
  const cached = store().byConversationId.get(conversationId)
  if (cached && cached.policyId === policy.policyId) return cached

  const detail = await storeChatConversationDetail(conversationId)
  const durable = detail?.behavioralSession ?? null
  if (durable && durable.policyId === policy.policyId) {
    store().byConversationId.set(conversationId, durable)
    return durable
  }

  const mirrored = personaId ? readPersonaAffect(personaId) : null
  if (mirrored && mirrored.policyId === policy.policyId) {
    const seeded: BehavioralSessionState = {
      ...mirrored,
      surface: 'chat',
      lookBeforeActSatisfied: true,
    }
    store().byConversationId.set(conversationId, seeded)
    return seeded
  }

  return getOrInitChatBehavioralSession(conversationId, policy)
}

/** Memory + durable jsonb + persona affect mirror + gold ledger. */
export async function persistChatBehavioralSession(
  conversationId: string,
  state: BehavioralSessionState,
  personaId?: string | null,
  policy?: import('@audion-v3/contracts').BehavioralPolicy | null,
): Promise<void> {
  saveChatBehavioralSession(conversationId, state)
  await storeChatSetBehavioralSession(conversationId, state)
  if (personaId?.trim()) mirrorPersonaAffect(personaId.trim(), state)
  if (policy && personaId?.trim()) {
    recordBehavioralGoldObservation(
      observationFromSession({
        policy,
        state,
        personaId: personaId.trim(),
        conversationId,
        surface: 'chat',
      }),
    )
  }
}

/** 0..1 stress intensity from user text vs persona triggers / avoidances. */
export function estimateChatTurnStress(
  policy: BehavioralPolicy,
  message: string,
): number {
  const text = (message || '').toLowerCase()
  if (!text.trim()) return 0.05

  let hits = 0
  const needles = [
    ...policy.qualitative.stressTriggers,
    ...policy.qualitative.avoidances,
  ]
  for (const raw of needles) {
    const n = raw.trim().toLowerCase()
    if (n.length < 4) continue
    // Match on significant tokens (≥4 chars) to avoid noise.
    const tokens = n.split(/[^a-z0-9äöüß]+/i).filter((t) => t.length >= 4)
    if (tokens.some((t) => text.includes(t))) hits += 1
  }

  let intensity = Math.min(1, hits * 0.28)
  if (/warum|why|prove|beweis|zeig mir|show me|unsinn|quatsch|falsch|wrong/i.test(text)) {
    intensity = Math.min(1, intensity + 0.15 * policy.dimensions.trustSkepticism)
  }
  if (text.length > 400) {
    intensity = Math.min(1, intensity + 0.08 * policy.dimensions.timePressure)
  }
  if (/^(hey|hi|hallo|servus|moin)\b/i.test(text.trim()) && text.length < 40) {
    intensity = Math.max(0, intensity - 0.2)
  }
  return Math.round(intensity * 100) / 100
}

function recoverSlightly(state: BehavioralSessionState): BehavioralSessionState {
  return {
    ...state,
    frustrationLoad: Math.max(0, Math.round((state.frustrationLoad - 0.06) * 100) / 100),
    fatigue: Math.max(0, Math.round((state.fatigue - 0.04) * 100) / 100),
    stance: state.frustrationLoad - 0.06 < 0.55 ? 'proceed' : state.stance,
  }
}

/**
 * Apply one chat turn: stress tick + fatigue + optional greeting recovery.
 */
export function applyChatTurnBehavioralTick(
  policy: BehavioralPolicy,
  state: BehavioralSessionState,
  message: string,
): BehavioralSessionState {
  const stress = estimateChatTurnStress(policy, message)
  let next = tickFrustration(policy, state, Math.max(0.05, stress))
  next = {
    ...next,
    turnIndex: state.turnIndex + 1,
    clarity: stress >= 0.5 ? Math.max(0, next.clarity - 1) : Math.min(3, next.clarity + (stress < 0.15 ? 1 : 0)),
  }

  const greeting = /^(hey|hi|hallo|servus|moin)\b/i.test((message || '').trim()) && (message || '').length < 40
  if (greeting) next = recoverSlightly(next)

  // Chat "abandon" = short/curt stance, not leaving the product.
  if (next.frustrationLoad >= 0.85 && policy.dimensions.timePressure >= 0.6) {
    next = { ...next, stance: 'abandon' }
  } else if (next.frustrationLoad >= 0.55) {
    next = { ...next, stance: 'hesitate' }
  } else if (next.stance === 'abandon' || next.stance === 'hesitate') {
    next = { ...next, stance: 'proceed' }
  }

  return next
}

export function buildChatLiveSessionEnvelope(
  policy: BehavioralPolicy,
  state: BehavioralSessionState,
): string {
  const lines = [
    BEHAVIORAL_LIVE_SESSION_HEADING,
    `Turn ${state.turnIndex} · stance=${state.stance} · frustration=${state.frustrationLoad.toFixed(2)} · fatigue=${state.fatigue.toFixed(2)} · clarity=${state.clarity}`,
  ]
  if (state.stance === 'hesitate') {
    lines.push(
      '- You feel a bit overloaded or unsure. Keep the reply shorter; one hedge is OK; do not interview the user.',
    )
  } else if (state.stance === 'abandon') {
    lines.push(
      '- You are close to checking out of this thread. Be curt, honest about friction, and do not over-explain. Offer to continue only if they rephrase simply.',
    )
  } else {
    lines.push('- Stay engaged and in character; match the behavioral envelope length.')
  }
  if (state.fatigue >= 0.5) {
    lines.push('- Fatigue is up: fewer sentences than usual; skip optional detail.')
  }
  if (policy.qualitative.stressTriggers.length && state.frustrationLoad >= 0.4) {
    lines.push(
      `- Soft spots right now: ${policy.qualitative.stressTriggers.slice(0, 3).join('; ')}.`,
    )
  }
  lines.push('- Do not narrate these scores or mention “session state”.')
  return lines.join('\n')
}

/** Token cap that shrinks under frustration/fatigue. */
export function resolveChatMaxTokensWithSession(
  policy: BehavioralPolicy | null | undefined,
  state: BehavioralSessionState | null | undefined,
  opts?: { greeting?: boolean; elicitation?: boolean },
): number {
  const base = resolvePersonaChatMaxTokens(policy, opts)
  if (!state) return base
  const shrink =
    1 - Math.min(0.45, state.frustrationLoad * 0.3 + state.fatigue * 0.2)
  return Math.max(80, Math.round(base * shrink))
}
