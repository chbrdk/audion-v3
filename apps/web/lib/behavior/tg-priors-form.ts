/**
 * Form helpers for TargetGroupEditDialog behavioral priors band.
 * Spec: specs/domain/target-group-fields.md § Editor UI
 */

import type {
  BehavioralDimensions,
  TargetGroupBehavioralPriors,
} from '@audion-v3/contracts'

/** Operator-facing subset — full dims remain available via API/JSON. */
export const TG_PRIOR_DIM_KEYS = [
  'timePressure',
  'trustSkepticism',
  'warmth',
  'detailOrientation',
  'stressSensitivity',
] as const satisfies ReadonlyArray<keyof BehavioralDimensions>

export type TgPriorDimKey = (typeof TG_PRIOR_DIM_KEYS)[number]

export type TgPriorsFormState = {
  /** null = unset (derive / no explicit blend). */
  blendWeight: number | null
  dimensions: Partial<Record<TgPriorDimKey, number | null>>
  segmentCues: string[]
  sharedStressTriggers: string[]
  sharedAvoidances: string[]
}

export function emptyTgPriorsForm(): TgPriorsFormState {
  return {
    blendWeight: null,
    dimensions: {},
    segmentCues: [],
    sharedStressTriggers: [],
    sharedAvoidances: [],
  }
}

export function tgPriorsFormFromStored(
  priors: TargetGroupBehavioralPriors | null | undefined,
): TgPriorsFormState {
  if (!priors) return emptyTgPriorsForm()
  const dimensions: TgPriorsFormState['dimensions'] = {}
  for (const key of TG_PRIOR_DIM_KEYS) {
    const v = priors.dimensions?.[key]
    if (typeof v === 'number' && Number.isFinite(v)) dimensions[key] = clamp01(v)
  }
  return {
    blendWeight:
      typeof priors.blendWeight === 'number' && Number.isFinite(priors.blendWeight)
        ? clamp01(priors.blendWeight)
        : null,
    dimensions,
    segmentCues: cleanList(priors.segmentCues),
    sharedStressTriggers: cleanList(priors.sharedStressTriggers),
    sharedAvoidances: cleanList(priors.sharedAvoidances),
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const s = item.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= 24) break
  }
  return out
}

/** Build write payload — null clears explicit priors. */
export function buildBehavioralPriorsPayload(
  form: TgPriorsFormState,
): TargetGroupBehavioralPriors | null {
  const dimensions: Partial<BehavioralDimensions> = {}
  let dimCount = 0
  for (const key of TG_PRIOR_DIM_KEYS) {
    const v = form.dimensions[key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      dimensions[key] = clamp01(v)
      dimCount += 1
    }
  }
  const segmentCues = cleanList(form.segmentCues)
  const sharedStressTriggers = cleanList(form.sharedStressTriggers)
  const sharedAvoidances = cleanList(form.sharedAvoidances)
  const hasBlend = typeof form.blendWeight === 'number' && Number.isFinite(form.blendWeight)
  const hasAnything =
    hasBlend ||
    dimCount > 0 ||
    segmentCues.length > 0 ||
    sharedStressTriggers.length > 0 ||
    sharedAvoidances.length > 0
  if (!hasAnything) return null

  const out: TargetGroupBehavioralPriors = {}
  out.blendWeight = hasBlend ? clamp01(form.blendWeight as number) : 0.25
  if (dimCount > 0) out.dimensions = dimensions
  if (segmentCues.length) out.segmentCues = segmentCues
  if (sharedStressTriggers.length) out.sharedStressTriggers = sharedStressTriggers
  if (sharedAvoidances.length) out.sharedAvoidances = sharedAvoidances
  return out
}
