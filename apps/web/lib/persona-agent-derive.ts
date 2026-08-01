/**
 * Derive UX-agent research profile + journey behaviour from magazine persona fields.
 * Used by stub AI workflow; native path asks the LLM for the same shape.
 */

import type {
  PersonaDetail,
  PersonaJourneyBehavior,
  PersonaJourneyDimensions,
  PersonaMotivation,
} from '@audion-v3/contracts'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

function round2(n: number): number {
  return Math.round(clamp01(n) * 100) / 100
}

/** Average matching trait scores; fallback when nothing matches. */
export function traitSignal(
  traits: Record<string, number>,
  patterns: RegExp[],
  fallback = 0.5,
): number {
  const hits: number[] = []
  for (const [label, score] of Object.entries(traits)) {
    if (!patterns.some((p) => p.test(label))) continue
    if (typeof score === 'number' && Number.isFinite(score)) hits.push(clamp01(score))
  }
  if (!hits.length) return fallback
  return round2(hits.reduce((a, b) => a + b, 0) / hits.length)
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

function mergeLabels(existing: string[], incoming: string[], max: number): string[] {
  return uniqLabels([...existing, ...incoming], max)
}

export function deriveJourneyDimensions(
  persona: PersonaDetail,
): PersonaJourneyDimensions {
  const traits = persona.traits ?? {}
  const riskAversion = traitSignal(
    traits,
    [/caution|careful|risk|safe|anxious|prudent|conserv/i],
    0.55,
  )
  const exploration = traitSignal(
    traits,
    [/curious|explor|adventur|open|playful|creative/i],
    0.5,
  )
  const detailOrientation = traitSignal(
    traits,
    [/detail|analy|thorough|precise|meticulous|systemat/i],
    0.55,
  )
  const trustSkepticism = traitSignal(
    traits,
    [/skept|critical|doubt|verif|distrust|question/i],
    0.5,
  )
  const timePressure = traitSignal(
    traits,
    [/impatient|busy|efficient|fast|urgent|decisive/i],
    0.45,
  )
  const accessibilityNeed = traitSignal(
    traits,
    [/inclus|access|empath|patient|careful|simple/i],
    0.4,
  )
  return {
    riskAversion,
    timePressure,
    exploration,
    detailOrientation,
    trustSkepticism,
    accessibilityNeed,
  }
}

export function deriveTechLiteracy(persona: PersonaDetail): number {
  const fromTraits = traitSignal(
    persona.traits ?? {},
    [/tech|digital|analytical|curious|savvy|innov/i],
    NaN,
  )
  if (Number.isFinite(fromTraits)) return fromTraits
  const blob = `${persona.role ?? ''} ${persona.archetype ?? ''} ${persona.bio ?? ''}`.toLowerCase()
  if (/engineer|developer|product|digital|saas|tech/.test(blob)) return 0.78
  if (/executive|leader|manager/.test(blob)) return 0.62
  return 0.55
}

export function deriveEmotionalBaseline(persona: PersonaDetail): string {
  const traits = Object.entries(persona.traits ?? {}).sort((a, b) => b[1] - a[1])
  const top = traits[0]?.[0]?.trim()
  if (top) {
    const valence = traits[0]![1]
    if (valence >= 0.7) return `${top.toLowerCase()}-confident`
    if (valence <= 0.4) return `${top.toLowerCase()}-guarded`
    return `${top.toLowerCase()}-steady`
  }
  if (persona.emotionalBaseline?.trim()) return persona.emotionalBaseline.trim()
  return 'curious-cautious'
}

export function deriveResearchProfile(persona: PersonaDetail): {
  techLiteracy: number
  emotionalBaseline: string
  stressTriggers: string[]
  motivations: PersonaMotivation[]
} {
  const stressTriggers = mergeLabels(
    persona.stressTriggers ?? [],
    (persona.frustrations ?? []).map((f) => f.label),
    8,
  )
  const motivations = (() => {
    const fromGoals = (persona.goals ?? []).map(
      (g): PersonaMotivation => ({ label: g.label, type: 'intrinsic' }),
    )
    const fromValues = (persona.values ?? []).slice(0, 3).map(
      (v): PersonaMotivation => ({ label: `Live by ${v}`, type: 'intrinsic' }),
    )
    const merged: PersonaMotivation[] = []
    const seen = new Set<string>()
    for (const m of [...(persona.motivations ?? []), ...fromGoals, ...fromValues]) {
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

  return {
    techLiteracy: deriveTechLiteracy(persona),
    emotionalBaseline: deriveEmotionalBaseline(persona),
    stressTriggers,
    motivations,
  }
}

export function deriveJourneyBehavior(persona: PersonaDetail): PersonaJourneyBehavior {
  const existing = persona.journeyBehavior
  const dimensionOverrides = deriveJourneyDimensions(persona)
  const dos = mergeLabels(
    existing?.dos ?? [],
    [
      ...(persona.values ?? []).slice(0, 3).map((v) => `Prefer paths that honour ${v}`),
      ...(persona.goals ?? []).slice(0, 2).map((g) => `Advance toward: ${g.label}`),
    ],
    8,
  )
  const donts = mergeLabels(
    existing?.donts ?? [],
    (persona.frustrations ?? []).slice(0, 4).map((f) => `Avoid: ${f.label}`),
    8,
  )
  const heuristics = mergeLabels(
    existing?.heuristics ?? [],
    Object.entries(persona.traits ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, score]) =>
        score >= 0.6
          ? `Lean into ${label} when choosing next UI actions`
          : `Watch for friction when ${label} is low`,
      ),
    8,
  )
  const extra =
    existing?.extraInstructions?.trim() ||
    `Navigate as ${persona.name} (${persona.role || 'persona'}): ground choices in traits, goals, and values from the magazine brief.`

  return {
    dimensionOverrides,
    dos,
    donts,
    heuristics,
    extraInstructions: extra,
  }
}

export function normalizeDeriveFacets(
  facets: Array<'researchProfile' | 'journeyBehavior'> | undefined,
): Array<'researchProfile' | 'journeyBehavior'> {
  const allowed = new Set(['researchProfile', 'journeyBehavior'])
  const cleaned = (facets ?? []).filter((f): f is 'researchProfile' | 'journeyBehavior' =>
    allowed.has(f),
  )
  return cleaned.length ? cleaned : ['researchProfile', 'journeyBehavior']
}
