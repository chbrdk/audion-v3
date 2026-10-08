/**
 * Chat dialogue dynamics — latency + repair/curt/non-answer modes.
 * Spec: specs/domain/chat-workspace.md § Dialogue dynamics (Phase 9)
 */

import type { BehavioralPolicy, BehavioralSessionState } from '@audion-v3/contracts'

export type ChatDynamicsMode = 'engage' | 'repair' | 'curt' | 'non_answer'

export type ChatDynamicsPlan = {
  mode: ChatDynamicsMode
  replyDelayMs: number
  summary: string
  /** Extra lines appended under ## Live session state. */
  envelopeLines: string[]
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Stable 0..1 from policyId + turn (no Math.random in hot path for tests). */
function unitJitter(policyId: string, turnIndex: number): number {
  let h = 2166136261
  const s = `${policyId}:${turnIndex}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

function looksConfused(message: string): boolean {
  const t = (message || '').trim().toLowerCase()
  if (!t) return false
  if (t.length < 8 && /\?$/.test(t)) return true
  return /(was meinst|what do you mean|huh\b|hä\b|versteh|don't get|dont get|unclear|nochmal|noch mal|\?{2,})/i.test(
    t,
  )
}

export function resolveChatDynamicsMode(
  policy: BehavioralPolicy,
  session: BehavioralSessionState,
  userMessage = '',
): ChatDynamicsMode {
  if (session.stance === 'abandon' && policy.dimensions.timePressure >= 0.66) {
    return 'non_answer'
  }
  if (session.stance === 'abandon') return 'curt'
  if (
    session.clarity <= 1 ||
    (looksConfused(userMessage) && policy.dimensions.repairWillingness >= 0.45)
  ) {
    return 'repair'
  }
  if (session.stance === 'hesitate' && session.frustrationLoad >= 0.55) {
    return 'curt'
  }
  return 'engage'
}

/**
 * Typing pause before the first visible token.
 * Impatient personas answer faster; frustrated/fatigued ones pause longer.
 */
export function resolveChatReplyDelayMs(
  policy: BehavioralPolicy,
  session: BehavioralSessionState,
): number {
  const d = policy.dimensions
  const base = 320 + (1 - d.timePressure) * 1100
  const affect = session.frustrationLoad * 700 + session.fatigue * 550
  const stanceBoost =
    session.stance === 'hesitate' ? 380 : session.stance === 'abandon' ? 180 : 0
  const raw = base + affect + stanceBoost
  const jitter = 0.88 + unitJitter(policy.policyId, session.turnIndex) * 0.24
  return Math.round(clamp(raw * jitter, 220, 2600))
}

export function buildChatDynamicsPlan(
  policy: BehavioralPolicy,
  session: BehavioralSessionState,
  userMessage = '',
): ChatDynamicsPlan {
  const mode = resolveChatDynamicsMode(policy, session, userMessage)
  const replyDelayMs = resolveChatReplyDelayMs(policy, session)
  const envelopeLines: string[] = [
    `## Dialogue dynamics`,
    `mode=${mode} · replyDelayMs≈${replyDelayMs}`,
  ]

  if (mode === 'repair') {
    envelopeLines.push(
      '- Clarity is low or the user sounds confused. Ask **one** short clarifying question. Do not full-answer until they clarify.',
      '- Keep it human (“Moment — meinst du X oder Y?” / “Wait, which part?”). No bullet dump.',
    )
  } else if (mode === 'curt') {
    envelopeLines.push(
      '- You are short with this thread. One or two blunt sentences. Name the friction once. Do not interview.',
    )
  } else if (mode === 'non_answer') {
    envelopeLines.push(
      '- You almost check out: give a single shrug / deflect line (honest impatience), then stop. No helpful essay. No follow-up question.',
    )
  } else {
    envelopeLines.push('- Stay engaged; match the behavioral envelope. Natural dialogue first.')
  }

  if (session.frustrationLoad >= 0.45 && mode === 'engage') {
    envelopeLines.push('- Mild friction: one hedge OK; do not over-explain.')
  }

  const summary =
    mode === 'engage'
      ? `delay ${replyDelayMs}ms`
      : `${mode} · delay ${replyDelayMs}ms`

  return { mode, replyDelayMs, summary, envelopeLines }
}

/** Append dynamics block to the live session envelope. */
export function withChatDynamicsEnvelope(
  liveEnvelope: string,
  plan: ChatDynamicsPlan,
): string {
  const block = plan.envelopeLines.join('\n')
  if (!liveEnvelope.trim()) return block
  return `${liveEnvelope.trim()}\n\n${block}`
}
