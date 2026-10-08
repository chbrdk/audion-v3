/**
 * Build a compact ChatReplyRationale from compiled policy + live session.
 * Spec: specs/domain/behavioral-controller.md § Explainable UI
 */

import type {
  BehavioralDimensions,
  BehavioralKnobSource,
  BehavioralPolicy,
  BehavioralSessionState,
  ChatReplyRationale,
  ChatReplyRationaleDriver,
} from '@audion-v3/contracts'
import { voiceLaneForChat, type ChatVoiceLane } from './chat-adapter'

const DRIVER_LABELS: Partial<Record<keyof BehavioralDimensions, string>> = {
  timePressure: 'Time',
  trustSkepticism: 'Trust',
  warmth: 'Warmth',
  verbosity: 'Verbosity',
  detailOrientation: 'Detail',
  formality: 'Formality',
  hedgeRate: 'Hedge',
  stressSensitivity: 'Stress',
  confidence: 'Confidence',
  repairWillingness: 'Repair',
  affectVolatility: 'Volatility',
  exploration: 'Explore',
  techLiteracy: 'Tech',
  attentionCapacity: 'Attention',
}

const SOURCE_LABEL: Record<BehavioralKnobSource, string> = {
  override: 'journey',
  scalar: 'scalar',
  trait: 'trait',
  tg_prior: 'TG',
  tg_segment: 'TG segment',
  derived: 'derived',
  default: 'default',
}

function directionFor(value: number): ChatReplyRationaleDriver['direction'] {
  if (value >= 0.66) return 'up'
  if (value <= 0.34) return 'down'
  return 'mid'
}

/** Soft-spot phrases from the user turn that appear in policy triggers/avoidances. */
export function listChatStressHits(policy: BehavioralPolicy, message: string): string[] {
  const text = (message || '').toLowerCase()
  if (!text.trim()) return []
  const pool = [
    ...policy.qualitative.stressTriggers,
    ...policy.qualitative.avoidances,
  ]
  const hits: string[] = []
  for (const raw of pool) {
    const phrase = typeof raw === 'string' ? raw.trim() : ''
    if (phrase.length < 3) continue
    if (text.includes(phrase.toLowerCase())) hits.push(phrase)
    if (hits.length >= 3) break
  }
  return hits
}

function pickDrivers(policy: BehavioralPolicy): ChatReplyRationaleDriver[] {
  const scored: Array<ChatReplyRationaleDriver & { extreme: number }> = []
  for (const [key, label] of Object.entries(DRIVER_LABELS) as Array<
    [keyof BehavioralDimensions, string]
  >) {
    const value = policy.dimensions[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const citation = policy.citations[key]
    const source = citation?.source ?? 'default'
    // Prefer non-default citations; still allow extremes from defaults when strong.
    const extreme = Math.abs(value - 0.5)
    if (extreme < 0.12 && source === 'default') continue
    if (extreme < 0.08) continue
    scored.push({
      key,
      label,
      value,
      direction: directionFor(value),
      source,
      ...(citation?.ref ? { ref: citation.ref } : {}),
      extreme: source === 'default' ? extreme * 0.7 : extreme + 0.05,
    })
  }
  scored.sort((a, b) => b.extreme - a.extreme)
  return scored.slice(0, 4).map(({ extreme: _e, ...d }) => d)
}

function laneWord(lane: ChatVoiceLane): string {
  return lane.charAt(0).toUpperCase() + lane.slice(1)
}

function stanceWord(stance: BehavioralSessionState['stance']): string {
  if (stance === 'abandon') return 'curt'
  return stance
}

function formatSummary(
  lane: ChatVoiceLane,
  session: BehavioralSessionState,
  drivers: ChatReplyRationaleDriver[],
  stressHits: string[],
): string {
  const parts: string[] = [`${laneWord(lane)} lane`, stanceWord(session.stance)]
  const arrows = drivers.slice(0, 2).map((d) => {
    const arrow = d.direction === 'up' ? '↑' : d.direction === 'down' ? '↓' : '·'
    return `${d.label.toLowerCase()}${arrow}`
  })
  if (arrows.length) parts.push(arrows.join(' '))
  if (stressHits.length) parts.push(`hit: ${stressHits[0]}`)
  return parts.join(' · ')
}

export type BuildChatReplyRationaleInput = {
  policy: BehavioralPolicy
  session: BehavioralSessionState
  traits?: Record<string, number>
  /** User message that triggered this assistant turn. */
  userMessage?: string
  dynamicsMode?: ChatReplyRationale['dynamicsMode']
  replyDelayMs?: number
  dynamicsSummary?: string
}

/** Pure builder — same inputs → same rationale. */
export function buildChatReplyRationale(
  input: BuildChatReplyRationaleInput,
): ChatReplyRationale {
  const { policy, session, traits = {}, userMessage = '' } = input
  const lane = voiceLaneForChat(policy, traits)
  const drivers = pickDrivers(policy)
  const stressHits = listChatStressHits(policy, userMessage)
  let summary = formatSummary(lane, session, drivers, stressHits)
  if (input.dynamicsSummary?.trim()) {
    summary = `${summary} · ${input.dynamicsSummary.trim()}`
  }
  return {
    policyId: policy.policyId,
    lane,
    stance: session.stance,
    frustrationLoad: session.frustrationLoad,
    fatigue: session.fatigue,
    turnIndex: session.turnIndex,
    drivers,
    ...(stressHits.length ? { stressHits } : {}),
    ...(input.dynamicsMode ? { dynamicsMode: input.dynamicsMode } : {}),
    ...(typeof input.replyDelayMs === 'number' ? { replyDelayMs: input.replyDelayMs } : {}),
    summary,
  }
}

export function sourceLabel(source: BehavioralKnobSource): string {
  return SOURCE_LABEL[source] ?? source
}
