import type { AiSuggestionItem, PersonaSuggestField } from '@audion-v3/contracts'
import type { PersonaFrustration, PersonaGoal } from '@audion-v3/contracts'

/** Append unique string suggestions (case-insensitive). */
export function mergeStringSuggestions(existing: string[], titles: string[]): string[] {
  const seen = new Set(existing.map((s) => s.trim().toLowerCase()).filter(Boolean))
  const next = [...existing]
  for (const raw of titles) {
    const title = raw.trim()
    if (!title) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(title)
  }
  return next
}

export function mergeGoalSuggestions(existing: PersonaGoal[], titles: string[]): PersonaGoal[] {
  const seen = new Set(existing.map((g) => g.label.trim().toLowerCase()).filter(Boolean))
  const next = [...existing]
  for (const raw of titles) {
    const label = raw.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push({ label, priority: next.length })
  }
  return next
}

export function mergeFrustrationSuggestions(
  existing: PersonaFrustration[],
  titles: string[],
): PersonaFrustration[] {
  const seen = new Set(existing.map((f) => f.label.trim().toLowerCase()).filter(Boolean))
  const next = [...existing]
  for (const raw of titles) {
    const label = raw.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push({ label, evidenceCount: 0 })
  }
  return next
}

/** Merge trait labels at score 0.7 when new. */
export function mergeTraitSuggestions(
  existing: Record<string, number>,
  titles: string[],
  score = 0.7,
): Record<string, number> {
  const next = { ...existing }
  for (const raw of titles) {
    const label = raw.trim()
    if (!label) continue
    const match = Object.keys(next).find((k) => k.toLowerCase() === label.toLowerCase())
    if (match) continue
    next[label] = Math.min(1, Math.max(0, score))
  }
  return next
}

export function suggestionTitles(items: AiSuggestionItem[]): string[] {
  return items.map((item) => item.title.trim()).filter(Boolean)
}

export function personaSuggestFieldLabel(field: PersonaSuggestField): string {
  switch (field) {
    case 'interests':
      return 'Interests'
    case 'values':
      return 'Values'
    case 'goals':
      return 'Goals'
    case 'frustrations':
      return 'Frustrations'
    case 'traits':
      return 'Traits'
    case 'vocabulary':
      return 'Vocabulary'
    case 'sentenceStructure':
      return 'Sentence structure'
    default:
      return field
  }
}
