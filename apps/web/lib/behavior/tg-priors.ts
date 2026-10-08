/**
 * Target-group behavioral priors: explicit + derived-from-linked.
 * Spec: specs/domain/behavioral-controller.md Phase 5
 */

import type {
  BehavioralDimensions,
  PersonaDetail,
  TargetGroupBehavioralPriors,
  TargetGroupDetail,
} from '@audion-v3/contracts'
import { compileBehavioralPolicy } from './compile-behavioral-policy'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

function round2(n: number): number {
  return Math.round(clamp01(n) * 100) / 100
}

const DIM_KEYS: (keyof BehavioralDimensions)[] = [
  'timePressure',
  'exploration',
  'detailOrientation',
  'attentionCapacity',
  'riskAversion',
  'trustSkepticism',
  'confidence',
  'techLiteracy',
  'accessibilityNeed',
  'affectVolatility',
  'stressSensitivity',
  'verbosity',
  'warmth',
  'formality',
  'hedgeRate',
  'repairWillingness',
  'interruptibility',
]

/** Mean dimensions across linked personas (soft segment centroid). */
export function deriveTargetGroupPriorsFromPersonas(
  personas: PersonaDetail[],
  opts?: { blendWeight?: number },
): TargetGroupBehavioralPriors | null {
  if (!personas.length) return null
  const policies = personas.map((p) => compileBehavioralPolicy({ persona: p }))
  const dimensions: Partial<BehavioralDimensions> = {}
  for (const key of DIM_KEYS) {
    const vals = policies.map((p) => p.dimensions[key])
    dimensions[key] = round2(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  const sharedStressTriggers = uniq(
    personas.flatMap((p) => p.stressTriggers ?? []),
    8,
  )
  const sharedAvoidances = uniq(
    personas.flatMap((p) => (p.frustrations ?? []).map((f) => f.label)),
    8,
  )
  return {
    blendWeight:
      typeof opts?.blendWeight === 'number' ? clamp01(opts.blendWeight) : 0.25,
    dimensions,
    sharedStressTriggers,
    sharedAvoidances,
  }
}

function uniq(items: string[], max: number): string[] {
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

/** Segment/description → weak lexicon cues. */
export function segmentCuesFromTargetGroup(tg: TargetGroupDetail): string[] {
  const blob = `${tg.segment} ${tg.description ?? ''}`
  const cues: string[] = []
  if (/impatient|busy|urgent|zeitdruck|schnell|time\s*press/i.test(blob)) cues.push('Impatient')
  if (/skeptic|critical|kritisch|prüf/i.test(blob)) cues.push('Skeptical')
  if (/detail|thorough|analyt|präzis/i.test(blob)) cues.push('Thorough')
  if (/curious|explor|offen|neugierig/i.test(blob)) cues.push('Curious')
  if (/warm|empath|care/i.test(blob)) cues.push('Empathic')
  if (/tech|digital|saas|software/i.test(blob)) cues.push('Tech-savvy')
  return cues
}

/**
 * Resolve priors for compile: explicit TG.behavioralPriors wins;
 * else derive from linked personas when provided; always merge segment cues.
 */
export function resolveTargetGroupPriors(
  tg: TargetGroupDetail | null | undefined,
  linkedPersonas?: PersonaDetail[] | null,
): TargetGroupBehavioralPriors | null {
  if (!tg) return null
  const cues = segmentCuesFromTargetGroup(tg)
  const explicit = tg.behavioralPriors ?? null
  const derived =
    !explicit?.dimensions && linkedPersonas?.length
      ? deriveTargetGroupPriorsFromPersonas(linkedPersonas)
      : null

  const base: TargetGroupBehavioralPriors = {
    blendWeight: explicit?.blendWeight ?? derived?.blendWeight ?? 0.25,
    dimensions: explicit?.dimensions ?? derived?.dimensions,
    segmentCues: uniq([...(explicit?.segmentCues ?? []), ...cues], 12),
    sharedStressTriggers: uniq(
      [
        ...(explicit?.sharedStressTriggers ?? []),
        ...(derived?.sharedStressTriggers ?? []),
      ],
      8,
    ),
    sharedAvoidances: uniq(
      [...(explicit?.sharedAvoidances ?? []), ...(derived?.sharedAvoidances ?? [])],
      8,
    ),
  }

  const hasSignal =
    Boolean(base.dimensions && Object.keys(base.dimensions).length) ||
    Boolean(base.segmentCues?.length) ||
    Boolean(base.sharedStressTriggers?.length) ||
    Boolean(base.sharedAvoidances?.length)
  return hasSignal ? base : null
}

export function normalizeBehavioralPriors(
  raw: unknown,
): TargetGroupBehavioralPriors | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const dimensions =
    rec.dimensions && typeof rec.dimensions === 'object'
      ? (rec.dimensions as Partial<BehavioralDimensions>)
      : undefined
  const out: TargetGroupBehavioralPriors = {
    blendWeight:
      typeof rec.blendWeight === 'number' && Number.isFinite(rec.blendWeight)
        ? clamp01(rec.blendWeight)
        : undefined,
    dimensions,
    segmentCues: Array.isArray(rec.segmentCues)
      ? rec.segmentCues.filter((s): s is string => typeof s === 'string')
      : undefined,
    sharedStressTriggers: Array.isArray(rec.sharedStressTriggers)
      ? rec.sharedStressTriggers.filter((s): s is string => typeof s === 'string')
      : undefined,
    sharedAvoidances: Array.isArray(rec.sharedAvoidances)
      ? rec.sharedAvoidances.filter((s): s is string => typeof s === 'string')
      : undefined,
  }
  return out
}
