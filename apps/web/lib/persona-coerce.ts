import type {
  PersonaFrustration,
  PersonaGoal,
  PersonaJourneyBehavior,
  PersonaJourneyDimensions,
} from '@audion-v3/contracts'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function coerceGoals(value: unknown): PersonaGoal[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry, index): PersonaGoal | null => {
      if (typeof entry === 'string' && entry.trim()) {
        return { label: entry.trim(), priority: index }
      }
      if (!entry || typeof entry !== 'object') return null
      const row = entry as Record<string, unknown>
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      if (!label) return null
      const priority = typeof row.priority === 'number' && Number.isFinite(row.priority) ? row.priority : index
      return { label, priority }
    })
    .filter((g): g is PersonaGoal => Boolean(g))
}

export function coerceFrustrations(value: unknown): PersonaFrustration[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): PersonaFrustration | null => {
      if (typeof entry === 'string' && entry.trim()) {
        return { label: entry.trim(), evidenceCount: 0 }
      }
      if (!entry || typeof entry !== 'object') return null
      const row = entry as Record<string, unknown>
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      if (!label) return null
      const evidenceCount =
        typeof row.evidenceCount === 'number' && Number.isFinite(row.evidenceCount)
          ? row.evidenceCount
          : typeof row.evidence_count === 'number' && Number.isFinite(row.evidence_count)
            ? row.evidence_count
            : 0
      return { label, evidenceCount }
    })
    .filter((f): f is PersonaFrustration => Boolean(f))
}

export function coerceJourneyBehavior(raw: unknown): PersonaJourneyBehavior | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const dimRaw = row.dimensionOverrides ?? row.dimension_overrides
  let dimensionOverrides: PersonaJourneyDimensions | null = null
  if (dimRaw && typeof dimRaw === 'object' && !Array.isArray(dimRaw)) {
    const d = dimRaw as Record<string, unknown>
    const pick = (camel: keyof PersonaJourneyDimensions, snake: string): number | null => {
      const v = d[camel] ?? d[snake]
      return typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : null
    }
    dimensionOverrides = {
      riskAversion: pick('riskAversion', 'risk_aversion'),
      timePressure: pick('timePressure', 'time_pressure'),
      exploration: pick('exploration', 'exploration'),
      detailOrientation: pick('detailOrientation', 'detail_orientation'),
      trustSkepticism: pick('trustSkepticism', 'trust_skepticism'),
      accessibilityNeed: pick('accessibilityNeed', 'accessibility_need'),
    }
    if (Object.values(dimensionOverrides).every((v) => v == null)) dimensionOverrides = null
  }
  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
  const dos = asList(row.dos)
  const donts = asList(row.donts)
  const extraInstructions =
    typeof row.extraInstructions === 'string'
      ? row.extraInstructions
      : typeof row.extra_instructions === 'string'
        ? row.extra_instructions
        : null
  if (!dimensionOverrides && !dos.length && !donts.length && !extraInstructions?.trim()) {
    return null
  }
  return {
    dimensionOverrides,
    dos,
    donts,
    extraInstructions: extraInstructions?.trim() || null,
  }
}
