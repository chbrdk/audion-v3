/**
 * Deterministic BehavioralPolicy compiler.
 * Spec: specs/domain/behavioral-controller.md
 */

import type {
  BehavioralBudgets,
  BehavioralDimensions,
  BehavioralKnobCitation,
  BehavioralKnobSource,
  BehavioralPolicy,
  BehavioralQualitative,
  BehavioralSessionState,
  BehavioralSurface,
  PersonaDetail,
  TargetGroupBehavioralPriors,
} from '@audion-v3/contracts'
import {
  BEHAVIORAL_SCHEMA_VERSION,
  BEHAVIORAL_TRAIT_LEXICON_VERSION,
} from '@audion-v3/contracts'

/** Stable short id without node:crypto (safe for vitest + future edge). */
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export type CompileBehavioralPolicyInput = {
  persona: PersonaDetail
  targetGroupId?: string | null
  tgPriors?: TargetGroupBehavioralPriors | null
  /** Override clock for tests. */
  now?: () => Date
}

type KnobBuild = {
  value: number
  citation: BehavioralKnobCitation
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

function round2(n: number): number {
  return Math.round(clamp01(n) * 100) / 100
}

function uniqLabels(items: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const s = raw.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= max) break
  }
  return out
}

/** Lexicon v1 — aligned with persona-agent-derive + chat trait hints. */
const LEXICON = {
  timePressure: [/impatient|busy|efficient|fast|urgent|decisive|time.?press/i],
  exploration: [/curious|explor|adventur|open|playful|creative/i],
  detailOrientation: [/detail|analy|thorough|precise|meticulous|systemat|conscient/i],
  riskAversion: [/caution|careful|risk|safe|anxious|prudent|conserv/i],
  trustSkepticism: [/skept|critical|doubt|verif|distrust|question/i],
  accessibilityNeed: [/inclus|access|empath|patient|careful|simple/i],
  techLiteracy: [/tech|digital|analytical|curious|savvy|innov/i],
  confidence: [/confiden|assertiv|bold|self.?assur/i],
  affectVolatility: [/neuro|anx|stress|worry|volatile|emotion/i],
  warmth: [/agree|empath|warm|kind|sociab|extra|outgoing/i],
  formality: [/formal|professional|corporat|execut/i],
} as const

function traitKnob(
  traits: Record<string, number>,
  patterns: readonly RegExp[],
  fallback: number,
): KnobBuild {
  const hits: Array<{ key: string; score: number }> = []
  for (const [label, score] of Object.entries(traits)) {
    if (!patterns.some((p) => p.test(label))) continue
    if (typeof score === 'number' && Number.isFinite(score)) {
      hits.push({ key: label, score: clamp01(score) })
    }
  }
  if (!hits.length) {
    return { value: round2(fallback), citation: { source: 'default' } }
  }
  const avg = hits.reduce((a, b) => a + b.score, 0) / hits.length
  const top = [...hits].sort((a, b) => b.score - a.score)[0]!
  return {
    value: round2(avg),
    citation: { source: 'trait', ref: top.key },
  }
}

function overrideKnob(
  raw: number | null | undefined,
  fallback: KnobBuild,
): KnobBuild {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { value: round2(raw), citation: { source: 'override' } }
  }
  return fallback
}

function scalarKnob(
  raw: number | null | undefined,
  fallback: KnobBuild,
  ref: string,
): KnobBuild {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { value: round2(raw), citation: { source: 'scalar', ref } }
  }
  return fallback
}

function parseAttentionCapacity(attentionSpan: string | null | undefined): KnobBuild | null {
  if (!attentionSpan?.trim()) return null
  const t = attentionSpan.toLowerCase()
  if (/very\s*short|kurz| sekunden|seconds|scatter|ablenk/i.test(t)) {
    return { value: 0.25, citation: { source: 'scalar', ref: 'attentionSpan' } }
  }
  if (/short|knapp|ungeduldig|fast/i.test(t)) {
    return { value: 0.4, citation: { source: 'scalar', ref: 'attentionSpan' } }
  }
  if (/long|hoch|deep|fokus|focus|ausdauer/i.test(t)) {
    return { value: 0.8, citation: { source: 'scalar', ref: 'attentionSpan' } }
  }
  if (/medium|mittel|normal|average/i.test(t)) {
    return { value: 0.55, citation: { source: 'scalar', ref: 'attentionSpan' } }
  }
  return { value: 0.5, citation: { source: 'scalar', ref: 'attentionSpan' } }
}

function techFromRoleBio(persona: PersonaDetail): KnobBuild {
  const blob = `${persona.role ?? ''} ${persona.archetype ?? ''} ${persona.bio ?? ''}`.toLowerCase()
  if (/engineer|developer|product|digital|saas|tech/.test(blob)) {
    return { value: 0.78, citation: { source: 'derived', ref: 'role_bio' } }
  }
  if (/executive|leader|manager/.test(blob)) {
    return { value: 0.62, citation: { source: 'derived', ref: 'role_bio' } }
  }
  return { value: 0.55, citation: { source: 'default' } }
}

function formalityFromRole(persona: PersonaDetail): KnobBuild {
  const blob = `${persona.role ?? ''} ${persona.archetype ?? ''}`.toLowerCase()
  if (/exec|ceo|cfo|director|vp|board|official/.test(blob)) {
    return { value: 0.75, citation: { source: 'derived', ref: 'role' } }
  }
  if (/student|intern|junior|creator|community/.test(blob)) {
    return { value: 0.35, citation: { source: 'derived', ref: 'role' } }
  }
  const trait = traitKnob(persona.traits ?? {}, LEXICON.formality, 0.5)
  return trait
}

/**
 * Blend TG prior only when persona citation is default (or weak derived without trait/scalar/override).
 */
function applyTgBlend(
  personaKnob: KnobBuild,
  tgValue: number | undefined,
  blendWeight: number,
  allowDerivedBlend: boolean,
): KnobBuild {
  if (typeof tgValue !== 'number' || !Number.isFinite(tgValue)) return personaKnob
  const w = clamp01(blendWeight)
  if (w <= 0) return personaKnob
  const soft =
    personaKnob.citation.source === 'default' ||
    personaKnob.citation.source === 'tg_segment' ||
    (allowDerivedBlend && personaKnob.citation.source === 'derived')
  if (!soft) return personaKnob
  const blended = round2((1 - w) * personaKnob.value + w * clamp01(tgValue))
  return {
    value: blended,
    citation: { source: 'tg_prior', ref: personaKnob.citation.ref },
  }
}

function buildBudgets(dims: BehavioralDimensions): BehavioralBudgets {
  const tp = dims.timePressure
  const detail = dims.detailOrientation
  const attention = dims.attentionCapacity
  const exploration = dims.exploration

  let tryBeforeAbandon = 4
  if (tp >= 0.75) tryBeforeAbandon = 3
  if (tp <= 0.35) tryBeforeAbandon = 6
  if (exploration >= 0.65) tryBeforeAbandon = Math.min(6, tryBeforeAbandon + 1)
  if (detail >= 0.75) tryBeforeAbandon = Math.min(7, tryBeforeAbandon + 1)

  let dwellMin = 2
  let dwellMax = 3
  if (tp >= 0.75) {
    dwellMin = 1
    dwellMax = 2
  } else if (tp <= 0.35) {
    dwellMin = 3
    dwellMax = 4
  }

  const workingMemorySlots = Math.min(
    5,
    Math.max(2, Math.round(2 + attention * 2 + detail * 1)),
  )

  // High time pressure / low verbosity → fewer tokens
  const verbosity = dims.verbosity
  const maxReplyTokens = Math.round(120 + verbosity * 280) // ~120–400
  const maxReplySentences = Math.max(1, Math.round(1 + verbosity * 4))

  return {
    workingMemorySlots,
    tryBeforeAbandon,
    dwellSeconds: { min: dwellMin, max: dwellMax },
    maxReplyTokens,
    maxReplySentences,
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildQualitative(
  persona: PersonaDetail,
  tg: TargetGroupBehavioralPriors | null | undefined,
  emotionalBaseline: string,
): BehavioralQualitative {
  const jb = persona.journeyBehavior
  const goalsActive = uniqLabels(
    [...(persona.goals ?? [])]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((g) => g.label),
    5,
  )
  const avoidances = uniqLabels(
    [
      ...(jb?.donts ?? []),
      ...(persona.frustrations ?? []).map((f) => f.label),
      ...(tg?.sharedAvoidances ?? []),
    ],
    8,
  )
  const stressTriggers = uniqLabels(
    [
      ...(persona.stressTriggers ?? []),
      ...(persona.frustrations ?? []).map((f) => f.label),
      ...(tg?.sharedStressTriggers ?? []),
    ],
    8,
  )
  const motivations = (() => {
    const merged: BehavioralQualitative['motivations'] = []
    const seen = new Set<string>()
    for (const m of [
      ...(persona.motivations ?? []),
      ...(persona.goals ?? []).map((g) => ({
        label: g.label,
        type: 'intrinsic' as const,
      })),
      ...(persona.values ?? []).slice(0, 3).map((v) => ({
        label: `Live by ${v}`,
        type: 'intrinsic' as const,
      })),
    ]) {
      const label = m.label.trim()
      if (!label) continue
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ label, type: m.type ?? 'intrinsic' })
      if (merged.length >= 8) break
    }
    return merged
  })()

  const dos = uniqLabels(
    [
      ...(jb?.dos ?? []),
      ...(persona.values ?? []).slice(0, 3).map((v) => `Prefer paths that honour ${v}`),
      ...goalsActive.slice(0, 2).map((g) => `Advance toward: ${g}`),
    ],
    8,
  )
  const donts = uniqLabels([...(jb?.donts ?? []), ...avoidances.slice(0, 4)], 8)
  const heuristics = uniqLabels(
    [
      ...(jb?.heuristics ?? []),
      ...Object.entries(persona.traits ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label, score]) =>
          score >= 0.6
            ? `Lean into ${label} when choosing next actions`
            : `Watch for friction when ${label} is low`,
        ),
    ],
    8,
  )

  const style = persona.communicationStyle
  const vocabulary = uniqLabels(style?.vocabulary ?? [], 12)
  const priorKnowledge = (persona.knowledgeEntries ?? [])
    .map((e) => {
      const title = (e.title || '').trim()
      const content = stripHtml(e.content || '').slice(0, 400)
      if (!title || !content) return null
      return { title, content }
    })
    .filter((x): x is { title: string; content: string } => Boolean(x))
    .slice(0, 4)

  return {
    emotionalBaseline,
    goalsActive,
    avoidances,
    stressTriggers,
    motivations,
    dos,
    donts,
    heuristics,
    vocabulary,
    sentenceStructure: style?.sentenceStructure?.trim() || null,
    priorKnowledge,
  }
}

function hashPolicyId(parts: {
  personaId: string
  targetGroupId: string | null
  dimensions: BehavioralDimensions
  budgets: BehavioralBudgets
}): string {
  const payload = JSON.stringify({
    s: BEHAVIORAL_SCHEMA_VERSION,
    l: BEHAVIORAL_TRAIT_LEXICON_VERSION,
    p: parts.personaId,
    t: parts.targetGroupId,
    d: parts.dimensions,
    b: parts.budgets,
  })
  return `${fnv1aHex(payload)}${fnv1aHex(payload.split('').reverse().join(''))}`
}

export function compileBehavioralPolicy(
  input: CompileBehavioralPolicyInput,
): BehavioralPolicy {
  const persona = input.persona
  const traits = persona.traits ?? {}
  const ov = persona.journeyBehavior?.dimensionOverrides
  const tg = input.tgPriors ?? null
  const blendWeight =
    typeof tg?.blendWeight === 'number' && Number.isFinite(tg.blendWeight)
      ? clamp01(tg.blendWeight)
      : tg
        ? 0.25
        : 0

  // Segment cue weak prior: synthetic trait map for lexicon hits
  const segmentTraits: Record<string, number> = {}
  for (const cue of tg?.segmentCues ?? []) {
    const c = cue.trim()
    if (c) segmentTraits[c] = 0.6
  }

  const timeFromTraits = traitKnob(traits, LEXICON.timePressure, 0.45)
  const timeFromSegment = traitKnob(segmentTraits, LEXICON.timePressure, 0.45)
  const timeBase: KnobBuild =
    timeFromTraits.citation.source === 'trait'
      ? timeFromTraits
      : timeFromSegment.citation.source === 'trait'
        ? { value: timeFromSegment.value, citation: { source: 'tg_segment', ref: timeFromSegment.citation.ref } }
        : timeFromTraits
  const timePressure = applyTgBlend(
    overrideKnob(ov?.timePressure, timeBase),
    tg?.dimensions?.timePressure,
    blendWeight,
    false,
  )

  const exploration = applyTgBlend(
    overrideKnob(ov?.exploration, traitKnob(traits, LEXICON.exploration, 0.5)),
    tg?.dimensions?.exploration,
    blendWeight,
    false,
  )

  const detailOrientation = applyTgBlend(
    overrideKnob(
      ov?.detailOrientation,
      traitKnob(traits, LEXICON.detailOrientation, 0.55),
    ),
    tg?.dimensions?.detailOrientation,
    blendWeight,
    false,
  )

  const riskAversion = applyTgBlend(
    overrideKnob(ov?.riskAversion, traitKnob(traits, LEXICON.riskAversion, 0.55)),
    tg?.dimensions?.riskAversion,
    blendWeight,
    false,
  )

  const trustFromStyle =
    typeof persona.communicationStyle?.skepticismLevel === 'number' &&
    Number.isFinite(persona.communicationStyle.skepticismLevel)
      ? ({
          value: round2(persona.communicationStyle.skepticismLevel),
          citation: { source: 'scalar' as const, ref: 'communicationStyle.skepticismLevel' },
        } satisfies KnobBuild)
      : null

  const trustSkepticism = applyTgBlend(
    overrideKnob(
      ov?.trustSkepticism,
      trustFromStyle ?? traitKnob(traits, LEXICON.trustSkepticism, 0.5),
    ),
    tg?.dimensions?.trustSkepticism,
    blendWeight,
    false,
  )

  const accessibilityNeed = applyTgBlend(
    overrideKnob(
      ov?.accessibilityNeed,
      traitKnob(traits, LEXICON.accessibilityNeed, 0.4),
    ),
    tg?.dimensions?.accessibilityNeed,
    blendWeight,
    false,
  )

  const confidence = applyTgBlend(
    scalarKnob(
      persona.confidence,
      traitKnob(traits, LEXICON.confidence, 0.55),
      'confidence',
    ),
    tg?.dimensions?.confidence,
    blendWeight,
    true,
  )

  const techFromTraits = traitKnob(traits, LEXICON.techLiteracy, 0.55)
  const techFallback =
    techFromTraits.citation.source === 'trait' ? techFromTraits : techFromRoleBio(persona)
  const techLiteracy = applyTgBlend(
    scalarKnob(persona.techLiteracy, techFallback, 'techLiteracy'),
    tg?.dimensions?.techLiteracy,
    blendWeight,
    true,
  )

  const attentionCapacity = applyTgBlend(
    parseAttentionCapacity(persona.attentionSpan) ??
      traitKnob(traits, [/focus|attention|concentr/i], 0.55),
    tg?.dimensions?.attentionCapacity,
    blendWeight,
    true,
  )

  const affectVolatility = applyTgBlend(
    traitKnob(traits, LEXICON.affectVolatility, 0.45),
    tg?.dimensions?.affectVolatility,
    blendWeight,
    false,
  )

  const stressHitCount =
    (persona.stressTriggers?.length ?? 0) + (persona.frustrations?.length ?? 0)
  const stressSensitivity: KnobBuild = applyTgBlend(
    {
      value: round2(
        clamp01(0.35 + affectVolatility.value * 0.35 + Math.min(0.3, stressHitCount * 0.04)),
      ),
      citation: {
        source: 'derived',
        ref: 'stressTriggers+volatility',
      },
    },
    tg?.dimensions?.stressSensitivity,
    blendWeight,
    true,
  )

  const warmth = applyTgBlend(
    traitKnob(traits, LEXICON.warmth, 0.5),
    tg?.dimensions?.warmth,
    blendWeight,
    false,
  )

  const formality = applyTgBlend(
    formalityFromRole(persona),
    tg?.dimensions?.formality,
    blendWeight,
    true,
  )

  // Communication composites (derived from core dims — cite derived)
  const verbosity: KnobBuild = {
    value: round2(
      clamp01(0.15 + detailOrientation.value * 0.55 + (1 - timePressure.value) * 0.35),
    ),
    citation: { source: 'derived', ref: 'detail+timePressure' },
  }
  const hedgeRate: KnobBuild = {
    value: round2(
      clamp01(
        riskAversion.value * 0.35 +
          (1 - confidence.value) * 0.35 +
          affectVolatility.value * 0.3,
      ),
    ),
    citation: { source: 'derived', ref: 'risk+confidence+volatility' },
  }
  const repairWillingness: KnobBuild = {
    value: round2(
      clamp01(exploration.value * 0.4 + warmth.value * 0.35 + (1 - riskAversion.value) * 0.25),
    ),
    citation: { source: 'derived', ref: 'exploration+warmth+risk' },
  }
  const interruptibility: KnobBuild = {
    value: round2(clamp01(timePressure.value * 0.55 + affectVolatility.value * 0.45)),
    citation: { source: 'derived', ref: 'timePressure+volatility' },
  }

  // Optional TG overlay on composites only if TG set them explicitly
  const verbosityFinal = applyTgBlend(
    verbosity,
    tg?.dimensions?.verbosity,
    blendWeight,
    true,
  )
  const warmthFinal = warmth
  const formalityFinal = formality
  const hedgeFinal = applyTgBlend(hedgeRate, tg?.dimensions?.hedgeRate, blendWeight, true)
  const repairFinal = applyTgBlend(
    repairWillingness,
    tg?.dimensions?.repairWillingness,
    blendWeight,
    true,
  )
  const interruptFinal = applyTgBlend(
    interruptibility,
    tg?.dimensions?.interruptibility,
    blendWeight,
    true,
  )

  const dimensions: BehavioralDimensions = {
    timePressure: timePressure.value,
    exploration: exploration.value,
    detailOrientation: detailOrientation.value,
    attentionCapacity: attentionCapacity.value,
    riskAversion: riskAversion.value,
    trustSkepticism: trustSkepticism.value,
    confidence: confidence.value,
    techLiteracy: techLiteracy.value,
    accessibilityNeed: accessibilityNeed.value,
    affectVolatility: affectVolatility.value,
    stressSensitivity: stressSensitivity.value,
    verbosity: verbosityFinal.value,
    warmth: warmthFinal.value,
    formality: formalityFinal.value,
    hedgeRate: hedgeFinal.value,
    repairWillingness: repairFinal.value,
    interruptibility: interruptFinal.value,
  }

  const citations: BehavioralPolicy['citations'] = {
    timePressure: timePressure.citation,
    exploration: exploration.citation,
    detailOrientation: detailOrientation.citation,
    attentionCapacity: attentionCapacity.citation,
    riskAversion: riskAversion.citation,
    trustSkepticism: trustSkepticism.citation,
    confidence: confidence.citation,
    techLiteracy: techLiteracy.citation,
    accessibilityNeed: accessibilityNeed.citation,
    affectVolatility: affectVolatility.citation,
    stressSensitivity: stressSensitivity.citation,
    verbosity: verbosityFinal.citation,
    warmth: warmthFinal.citation,
    formality: formalityFinal.citation,
    hedgeRate: hedgeFinal.citation,
    repairWillingness: repairFinal.citation,
    interruptibility: interruptFinal.citation,
  }

  const emotionalBaseline =
    persona.emotionalBaseline?.trim() ||
    (() => {
      const top = Object.entries(traits).sort((a, b) => b[1] - a[1])[0]
      if (!top) return 'curious-cautious'
      const [label, score] = top
      if (score >= 0.7) return `${label.toLowerCase()}-confident`
      if (score <= 0.4) return `${label.toLowerCase()}-guarded`
      return `${label.toLowerCase()}-steady`
    })()

  const qualitative = buildQualitative(persona, tg, emotionalBaseline)
  const budgets = buildBudgets(dimensions)
  const targetGroupId = input.targetGroupId ?? null
  const compiledAt = (input.now ?? (() => new Date))().toISOString()
  const policyId = hashPolicyId({
    personaId: persona.id,
    targetGroupId,
    dimensions,
    budgets,
  })

  return {
    schemaVersion: BEHAVIORAL_SCHEMA_VERSION,
    traitLexiconVersion: BEHAVIORAL_TRAIT_LEXICON_VERSION,
    policyId,
    compiledAt,
    personaId: persona.id,
    targetGroupId,
    dimensions,
    qualitative,
    budgets,
    citations,
  }
}

export function initBehavioralSessionState(
  policy: BehavioralPolicy,
  surface: BehavioralSurface,
): BehavioralSessionState {
  return {
    surface,
    frustrationLoad: 0,
    clarity: 2,
    fatigue: 0,
    tryBudgetRemaining: policy.budgets.tryBeforeAbandon,
    lookBeforeActSatisfied: false,
    stance: 'hesitate',
    turnIndex: 0,
    episodic: [],
    policyId: policy.policyId,
  }
}

/**
 * Tick frustration after a stress-relevant event.
 * `intensity` 0..1 (e.g. confusion, failed click, trigger match).
 */
export function tickFrustration(
  policy: BehavioralPolicy,
  state: BehavioralSessionState,
  intensity: number,
): BehavioralSessionState {
  const delta = clamp01(intensity) * (0.08 + policy.dimensions.stressSensitivity * 0.22)
  const frustrationLoad = round2(clamp01(state.frustrationLoad + delta))
  const fatigue = round2(
    clamp01(state.fatigue + 0.03 + policy.dimensions.timePressure * 0.04),
  )
  let stance = state.stance
  if (
    frustrationLoad >= 0.85 &&
    state.tryBudgetRemaining <= 0 &&
    policy.dimensions.timePressure >= 0.6
  ) {
    stance = 'abandon'
  } else if (frustrationLoad >= 0.55) {
    stance = 'hesitate'
  }
  return { ...state, frustrationLoad, fatigue, stance }
}

export function consumeTryBudget(
  policy: BehavioralPolicy,
  state: BehavioralSessionState,
  key: string,
): BehavioralSessionState {
  const episodic = [
    ...state.episodic.filter((e) => !(e.kind === 'try' && e.key === key)),
    { kind: 'try' as const, key, at: state.turnIndex },
  ]
  return {
    ...state,
    tryBudgetRemaining: Math.max(0, state.tryBudgetRemaining - 1),
    turnIndex: state.turnIndex + 1,
    episodic: episodic.slice(-policy.budgets.workingMemorySlots),
  }
}

/** Journey-compatible snake_case dimension map from compiled policy. */
export function policyToJourneyDimensionOverrides(
  policy: BehavioralPolicy,
): Record<string, number> {
  const d = policy.dimensions
  return {
    risk_aversion: d.riskAversion,
    time_pressure: d.timePressure,
    exploration: d.exploration,
    detail_orientation: d.detailOrientation,
    trust_skepticism: d.trustSkepticism,
    accessibility_need: d.accessibilityNeed,
  }
}

export type { BehavioralKnobSource }
