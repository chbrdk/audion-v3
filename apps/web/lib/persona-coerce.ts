import type { PersonaFrustration, PersonaGoal } from '@audion-v3/contracts'

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
