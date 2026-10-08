/**
 * Cross-surface behavioral policy (browse / chat / video).
 * Spec: specs/domain/behavioral-controller.md
 */

export const BEHAVIORAL_SCHEMA_VERSION = '2026-10-behavioral-v1' as const
export const BEHAVIORAL_TRAIT_LEXICON_VERSION = '2026-10-lexicon-v1' as const

export type BehavioralSurface = 'browse' | 'chat' | 'video'

export type BehavioralKnobSource =
  | 'override'
  | 'scalar'
  | 'trait'
  | 'tg_prior'
  | 'tg_segment'
  | 'derived'
  | 'default'

export type BehavioralKnobCitation = {
  source: BehavioralKnobSource
  /** Trait key, field name, or TG id fragment for audit. */
  ref?: string
}

/** Canonical 0..1 knobs shared by all surfaces. */
export type BehavioralDimensions = {
  timePressure: number
  exploration: number
  detailOrientation: number
  attentionCapacity: number
  riskAversion: number
  trustSkepticism: number
  confidence: number
  techLiteracy: number
  accessibilityNeed: number
  affectVolatility: number
  stressSensitivity: number
  verbosity: number
  warmth: number
  formality: number
  hedgeRate: number
  repairWillingness: number
  interruptibility: number
}

export type BehavioralMotivation = {
  label: string
  type?: 'intrinsic' | 'extrinsic' | null
}

export type BehavioralQualitative = {
  emotionalBaseline: string
  goalsActive: string[]
  avoidances: string[]
  stressTriggers: string[]
  motivations: BehavioralMotivation[]
  dos: string[]
  donts: string[]
  heuristics: string[]
  vocabulary: string[]
  sentenceStructure: string | null
  priorKnowledge: Array<{ title: string; content: string }>
}

export type BehavioralBudgets = {
  /** Hard cap on remembered try keys. */
  workingMemorySlots: number
  /** Exploratory acts before abandon is allowed (browse). */
  tryBeforeAbandon: number
  /** First-look dwell seconds (browse). */
  dwellSeconds: { min: number; max: number }
  /** Chat / video max completion tokens hint. */
  maxReplyTokens: number
  /** Soft max sentences in a chat/video turn. */
  maxReplySentences: number
}

export type BehavioralPolicy = {
  schemaVersion: typeof BEHAVIORAL_SCHEMA_VERSION
  traitLexiconVersion: typeof BEHAVIORAL_TRAIT_LEXICON_VERSION
  policyId: string
  compiledAt: string
  personaId: string
  targetGroupId: string | null
  dimensions: BehavioralDimensions
  qualitative: BehavioralQualitative
  budgets: BehavioralBudgets
  citations: Partial<Record<keyof BehavioralDimensions, BehavioralKnobCitation>>
}

/** Optional TG bias layer — see target-group-fields.md. */
export type TargetGroupBehavioralPriors = {
  blendWeight?: number
  dimensions?: Partial<BehavioralDimensions>
  segmentCues?: string[]
  sharedStressTriggers?: string[]
  sharedAvoidances?: string[]
}

export type BehavioralStance = 'proceed' | 'hesitate' | 'abandon'

export type BehavioralEpisodicEntry = {
  kind: 'try' | 'notice' | 'topic' | 'repair'
  key: string
  at: number
}

/** Mutable runtime state — initialized from policy, updated per turn/step. */
export type BehavioralSessionState = {
  surface: BehavioralSurface
  frustrationLoad: number
  clarity: number
  fatigue: number
  tryBudgetRemaining: number
  lookBeforeActSatisfied: boolean
  stance: BehavioralStance
  turnIndex: number
  episodic: BehavioralEpisodicEntry[]
  policyId: string
}

/** Phase 6 — single run/turn sample for gold correlation. */
export type BehavioralGoldLabel = 'synthetic' | 'human_gold'

export type BehavioralGoldMetrics = {
  frustrationLoad: number
  fatigue: number
  clarity: number
  stance: BehavioralStance
  turnIndex: number
  timePressure: number
  verbosity: number
  stressSensitivity: number
  maxReplyTokens?: number | null
  /** Browse lab correlator attachment. */
  closerToHuman?: boolean | null
  correlateScore?: number | null
}

export type BehavioralGoldObservation = {
  id: string
  policyId: string
  schemaVersion: string
  surface: BehavioralSurface
  personaId: string
  conversationId?: string | null
  recordedAt: string
  label: BehavioralGoldLabel
  metrics: BehavioralGoldMetrics
}

export type BehavioralGoldCheck = {
  id: string
  label: string
  pass: boolean
  weight: number
  detail: string
}

export type BehavioralPolicyScoreboard = {
  policyId: string
  n: number
  syntheticCount: number
  humanGoldCount: number
  surfaces: Partial<Record<BehavioralSurface, number>>
  means: {
    frustrationLoad: number
    fatigue: number
    clarity: number
    timePressure: number
    verbosity: number
  }
  stanceHistogram: Partial<Record<BehavioralStance, number>>
  closer: boolean
  score: number
  checks: BehavioralGoldCheck[]
  verdict: string
}
