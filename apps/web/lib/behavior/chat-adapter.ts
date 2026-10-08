/**
 * BehavioralPolicy → persona chat (prompt envelope + token budgets).
 * Spec: specs/domain/behavioral-controller.md Phase 2
 */

import type { BehavioralPolicy } from '@audion-v3/contracts'
import { paths } from '../paths'

export const BEHAVIORAL_CHAT_ENVELOPE_HEADING = '## Behavioral envelope'

export type ChatVoiceLane = 'impatient' | 'skeptical' | 'warm' | 'balanced'

export function voiceLaneFromPolicy(policy: BehavioralPolicy): ChatVoiceLane {
  const d = policy.dimensions
  const ranked: Array<[ChatVoiceLane, number]> = [
    ['impatient', d.timePressure],
    ['skeptical', d.trustSkepticism],
    ['warm', d.warmth],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  return ranked[0]![1] >= 0.66 ? ranked[0]![0] : 'balanced'
}

/**
 * Few-shot lane: policy dims first; optional trait boost so magazine
 * Impatience/Warmth still steers voice when journey overrides are mid-range.
 */
export function voiceLaneForChat(
  policy: BehavioralPolicy,
  traits: Record<string, number>,
): ChatVoiceLane {
  let impatient = policy.dimensions.timePressure
  let skeptical = policy.dimensions.trustSkepticism
  let warm = policy.dimensions.warmth
  for (const [name, raw] of Object.entries(traits)) {
    const score =
      typeof raw === 'number' && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0
    const key = name.toLowerCase()
    if (/impat|time|urgent|speed/.test(key)) impatient = Math.max(impatient, score)
    if (/skept|trust|critic|neuro|anx/.test(key)) skeptical = Math.max(skeptical, score)
    if (/agree|empath|warm|extra|sociab/.test(key)) warm = Math.max(warm, score)
  }
  const ranked: Array<[ChatVoiceLane, number]> = [
    ['impatient', impatient],
    ['skeptical', skeptical],
    ['warm', warm],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  return ranked[0]![1] >= 0.66 ? ranked[0]![0] : 'balanced'
}

/** Spoken length band from compiled verbosity / budgets. */
export function chatLengthGuidance(policy: BehavioralPolicy): {
  sentenceMin: number
  sentenceMax: number
  wordMin: number
  wordMax: number
} {
  const maxSentences = Math.max(1, policy.budgets.maxReplySentences)
  const sentenceMax = Math.min(6, maxSentences)
  const sentenceMin = Math.max(1, Math.min(2, sentenceMax))
  const wordMax = Math.min(120, 25 + Math.round(policy.dimensions.verbosity * 90))
  const wordMin = Math.max(15, Math.round(wordMax * 0.4))
  return { sentenceMin, sentenceMax, wordMin, wordMax }
}

/**
 * Hard rules derived from policy — LLM must follow; runtime also caps tokens.
 */
export function buildChatBehavioralEnvelope(
  policy: BehavioralPolicy,
  traits: Record<string, number> = {},
): string {
  const d = policy.dimensions
  const len = chatLengthGuidance(policy)
  const lane = voiceLaneForChat(policy, traits)
  const lines = [
    BEHAVIORAL_CHAT_ENVELOPE_HEADING,
    `Compiled policy ${policy.schemaVersion} · lane=${lane} · policyId=${policy.policyId}`,
    `- Tempo: timePressure ${d.timePressure.toFixed(2)} → default ${len.sentenceMin}–${len.sentenceMax} sentences (~${len.wordMin}–${len.wordMax} words).`,
    `- Hedge rate ${d.hedgeRate.toFixed(2)}: ${d.hedgeRate >= 0.66 ? 'allow soft uncertainty (“vielleicht”, “ich glaub”)' : d.hedgeRate <= 0.34 ? 'be direct; minimize hedges' : 'balanced hedges'}.`,
    `- Warmth ${d.warmth.toFixed(2)}: ${d.warmth >= 0.66 ? 'brief rapport OK' : d.warmth <= 0.34 ? 'reserved; facts over small talk' : 'neutral warmth'}.`,
    `- Formality ${d.formality.toFixed(2)}: ${d.formality >= 0.66 ? 'more professional register' : d.formality <= 0.34 ? 'casual register' : 'everyday register'}.`,
    `- Skepticism ${d.trustSkepticism.toFixed(2)}: ${d.trustSkepticism >= 0.66 ? 'challenge weak claims once; ask for proof sparingly' : 'do not over-interrogate'}.`,
    `- Repair ${d.repairWillingness.toFixed(2)}: ${d.repairWillingness >= 0.6 ? 'you may ask one short clarifying question when confused' : 'prefer stating confusion over interviewing the user'}.`,
    `- Stress sensitivity ${d.stressSensitivity.toFixed(2)}; triggers: ${
      policy.qualitative.stressTriggers.slice(0, 4).join('; ') || 'none listed'
    }.`,
    '- Do not narrate these scores. Show them in tone, length, and what you care about.',
  ]
  return lines.join('\n')
}

/** Dynamic length line for the shared chat-rules block. */
export function chatRulesLengthLine(policy: BehavioralPolicy): string {
  const len = chatLengthGuidance(policy)
  return `- Default length: ${len.sentenceMin}–${len.sentenceMax} short sentences (~${len.wordMin}–${len.wordMax} words). Only go longer if the user clearly asks for depth, a list, or many questions.`
}

/**
 * Token cap for native chat. Env `AI_CHAT_MAX_TOKENS` still wins (ops ceiling).
 */
export function resolvePersonaChatMaxTokens(
  policy: BehavioralPolicy | null | undefined,
  opts?: { greeting?: boolean; elicitation?: boolean },
): number {
  const raw = process.env[paths.envAiChatMaxTokens]?.trim()
  if (raw) {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n > 0) return Math.min(n, 4096)
  }

  const fromPolicy = policy?.budgets.maxReplyTokens
  const base =
    typeof fromPolicy === 'number' && Number.isFinite(fromPolicy)
      ? Math.min(400, Math.max(100, Math.round(fromPolicy)))
      : paths.chatCompletionMaxTokens

  if (opts?.greeting) return Math.min(120, base)
  if (opts?.elicitation) {
    return Math.min(4096, Math.max(base, paths.chatElicitationMaxTokens))
  }
  return base
}
