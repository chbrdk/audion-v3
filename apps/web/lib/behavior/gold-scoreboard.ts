/**
 * Human-gold scoreboard keyed by policyId.
 * Spec: specs/domain/behavioral-gold-scoreboard.md
 */

import type {
  BehavioralGoldCheck,
  BehavioralGoldObservation,
  BehavioralPolicy,
  BehavioralPolicyScoreboard,
  BehavioralSessionState,
  BehavioralSurface,
} from '@audion-v3/contracts'
import { BEHAVIORAL_SCHEMA_VERSION } from '@audion-v3/contracts'

export type BehavioralGoldBand = {
  frustrationMin: number
  frustrationMax: number
  fatigueMin: number
  fatigueMax: number
  abandonRateMax: number
  closerRateMin: number
  closerScoreThreshold: number
  minN: number
}

/** Default human-like affect bands (chat/video). Spec table. */
export const DEFAULT_BEHAVIORAL_GOLD_BAND: BehavioralGoldBand = {
  frustrationMin: 0.12,
  frustrationMax: 0.55,
  fatigueMin: 0.05,
  fatigueMax: 0.45,
  abandonRateMax: 0.35,
  closerRateMin: 0.65,
  closerScoreThreshold: 0.65,
  minN: 3,
}

export function observationFromSession(input: {
  policy: BehavioralPolicy
  state: BehavioralSessionState
  personaId: string
  conversationId?: string | null
  surface?: BehavioralSurface
  label?: BehavioralGoldObservation['label']
  now?: () => Date
}): BehavioralGoldObservation {
  const surface = input.surface ?? input.state.surface
  const recordedAt = (input.now ?? (() => new Date))().toISOString()
  return {
    id: `bg-${input.policy.policyId.slice(0, 8)}-t${input.state.turnIndex}-${(
      input.conversationId ?? 'x'
    ).slice(0, 10)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    policyId: input.policy.policyId,
    schemaVersion: input.policy.schemaVersion || BEHAVIORAL_SCHEMA_VERSION,
    surface,
    personaId: input.personaId,
    conversationId: input.conversationId ?? null,
    recordedAt,
    label: input.label ?? 'synthetic',
    metrics: {
      frustrationLoad: input.state.frustrationLoad,
      fatigue: input.state.fatigue,
      clarity: input.state.clarity,
      stance: input.state.stance,
      turnIndex: input.state.turnIndex,
      timePressure: input.policy.dimensions.timePressure,
      verbosity: input.policy.dimensions.verbosity,
      stressSensitivity: input.policy.dimensions.stressSensitivity,
      maxReplyTokens: input.policy.budgets.maxReplyTokens,
      closerToHuman: null,
      correlateScore: null,
    },
  }
}

function mean(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function aggregatePolicyScoreboard(
  policyId: string,
  observations: BehavioralGoldObservation[],
  band: BehavioralGoldBand = DEFAULT_BEHAVIORAL_GOLD_BAND,
): BehavioralPolicyScoreboard {
  const rows = observations.filter((o) => o.policyId === policyId)
  const n = rows.length
  const syntheticCount = rows.filter((o) => o.label === 'synthetic').length
  const humanGoldCount = rows.filter((o) => o.label === 'human_gold').length

  const surfaces: BehavioralPolicyScoreboard['surfaces'] = {}
  for (const row of rows) {
    surfaces[row.surface] = (surfaces[row.surface] ?? 0) + 1
  }

  const stanceHistogram: BehavioralPolicyScoreboard['stanceHistogram'] = {}
  for (const row of rows) {
    const s = row.metrics.stance
    stanceHistogram[s] = (stanceHistogram[s] ?? 0) + 1
  }

  const means = {
    frustrationLoad: round2(mean(rows.map((r) => r.metrics.frustrationLoad))),
    fatigue: round2(mean(rows.map((r) => r.metrics.fatigue))),
    clarity: round2(mean(rows.map((r) => r.metrics.clarity))),
    timePressure: round2(mean(rows.map((r) => r.metrics.timePressure))),
    verbosity: round2(mean(rows.map((r) => r.metrics.verbosity))),
  }

  const abandonRate = n ? (stanceHistogram.abandon ?? 0) / n : 0
  const browseRows = rows.filter((r) => typeof r.metrics.closerToHuman === 'boolean')
  const closerRate = browseRows.length
    ? browseRows.filter((r) => r.metrics.closerToHuman).length / browseRows.length
    : null

  const checks: BehavioralGoldCheck[] = []
  const push = (
    id: string,
    label: string,
    pass: boolean,
    weight: number,
    detail: string,
  ) => checks.push({ id, label, pass, weight, detail })

  push(
    'sample_size',
    'n≥3',
    n >= band.minN,
    2,
    n >= band.minN ? `n=${n}` : `n=${n} (need ${band.minN} for closer claim)`,
  )
  push(
    'frustration_band',
    'Frustration in gold band',
    n > 0 &&
      means.frustrationLoad >= band.frustrationMin &&
      means.frustrationLoad <= band.frustrationMax,
    2,
    `mean=${means.frustrationLoad} band=[${band.frustrationMin},${band.frustrationMax}]`,
  )
  push(
    'fatigue_band',
    'Fatigue in gold band',
    n > 0 && means.fatigue >= band.fatigueMin && means.fatigue <= band.fatigueMax,
    1.5,
    `mean=${means.fatigue} band=[${band.fatigueMin},${band.fatigueMax}]`,
  )
  push(
    'abandon_rate',
    'Abandon rate capped',
    n > 0 && abandonRate <= band.abandonRateMax,
    2,
    `rate=${round2(abandonRate)} max=${band.abandonRateMax}`,
  )
  if (closerRate !== null) {
    push(
      'browse_closer_rate',
      'Browse closer-to-human rate',
      closerRate >= band.closerRateMin,
      2,
      `rate=${round2(closerRate)} min=${band.closerRateMin} (n=${browseRows.length})`,
    )
  }
  push(
    'has_human_gold',
    'Paired human gold present',
    humanGoldCount > 0,
    1,
    humanGoldCount > 0
      ? `${humanGoldCount} human_gold observation(s)`
      : 'No human_gold rows yet — synthetic-only ledger',
  )

  const weightSum = checks.reduce((a, c) => a + c.weight, 0) || 1
  const score = round2(
    checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0) / weightSum,
  )
  const closer = n >= band.minN && score >= band.closerScoreThreshold
  const verdict = !n
    ? 'No observations for this policy yet.'
    : closer
      ? `Closer to gold (score ${score}, n=${n}).`
      : `Not yet closer (score ${score}, n=${n}). Keep pairing human_gold and synthetic runs.`

  return {
    policyId,
    n,
    syntheticCount,
    humanGoldCount,
    surfaces,
    means,
    stanceHistogram,
    closer,
    score,
    checks,
    verdict,
  }
}

export function listPolicyScoreboards(
  observations: BehavioralGoldObservation[],
  band?: BehavioralGoldBand,
): BehavioralPolicyScoreboard[] {
  const ids = [...new Set(observations.map((o) => o.policyId))]
  return ids
    .map((id) => aggregatePolicyScoreboard(id, observations, band))
    .sort((a, b) => b.n - a.n || b.score - a.score)
}
