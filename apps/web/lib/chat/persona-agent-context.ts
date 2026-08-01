/**
 * Map product PersonaDetail → nested Agent PersonaContext for UX Journey runs.
 */

import type {
  PersonaDetail,
  PersonaJourneyDimensions,
  PersonaSection,
} from '@audion-v3/contracts'
import { generateDefaultPersonaSystemPrompt } from '../fixtures/persona-prompts-store'
import { storePersonaDetail } from '../fixtures/persona-store'
import { resolvePersonaSystemPrompt } from '../fixtures/persona-prompts-store'

export type AgentPersonaContext = {
  id: string
  name: string
  headline?: string
  systemPrompt?: string
  locale?: string
  profile: {
    bio?: string
    location?: string
    values?: string[]
    interests?: string[]
    traits?: string[]
    painPoints?: string[]
    goals?: string[]
    communicationStyle?: PersonaDetail['communicationStyle']
  }
  dimensionOverrides?: Record<string, number>
  dos?: string[]
  donts?: string[]
  extraInstructions?: string
}

const DIM_KEY_MAP: Record<keyof PersonaJourneyDimensions, string> = {
  riskAversion: 'risk_aversion',
  timePressure: 'time_pressure',
  exploration: 'exploration',
  detailOrientation: 'detail_orientation',
  trustSkepticism: 'trust_skepticism',
  accessibilityNeed: 'accessibility_need',
}

const SECTION_EXTRA_TITLES = /^(mindset|working with)/i

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function traitsToList(traits: Record<string, number>): string[] {
  return Object.entries(traits)
    .filter(([k]) => k.trim())
    .map(([k, v]) => `${k}: ${clamp01(v).toFixed(2)}`)
}

function sectionExtraInstructions(sections: PersonaSection[]): string | null {
  const parts = sections
    .filter((s) => SECTION_EXTRA_TITLES.test((s.title || '').trim()))
    .map((s) => {
      const title = (s.title || '').trim()
      const body = (s.body || '').trim()
      if (!title || !body) return null
      return `${title}: ${body}`
    })
    .filter((p): p is string => Boolean(p))
  if (!parts.length) return null
  return parts.join('\n\n')
}

export function dimensionOverridesForAgent(
  dims: PersonaJourneyDimensions | null | undefined,
): Record<string, number> | undefined {
  if (!dims) return undefined
  const out: Record<string, number> = {}
  for (const [camel, snake] of Object.entries(DIM_KEY_MAP) as Array<
    [keyof PersonaJourneyDimensions, string]
  >) {
    const raw = dims[camel]
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    out[snake] = Math.round(clamp01(raw) * 100) / 100
  }
  return Object.keys(out).length ? out : undefined
}

export function toAgentPersonaContext(
  persona: PersonaDetail | null,
  opts?: { locale?: string; systemPrompt?: string | null },
): AgentPersonaContext | { id: string } | null {
  if (!persona) return null

  const headline = (persona.role || persona.archetype || '').trim() || undefined
  const systemPrompt = (opts?.systemPrompt ?? '').trim() || undefined
  const goals = persona.goals.map((g) => g.label.trim()).filter(Boolean)
  const painPoints = persona.frustrations.map((f) => f.label.trim()).filter(Boolean)
  const traits = traitsToList(persona.traits)
  const jb = persona.journeyBehavior
  const overrides = dimensionOverridesForAgent(jb?.dimensionOverrides)
  const dos = (jb?.dos ?? []).map((d) => d.trim()).filter(Boolean).slice(0, 8)
  const donts = (jb?.donts ?? []).map((d) => d.trim()).filter(Boolean).slice(0, 8)
  const dslExtra = jb?.extraInstructions?.trim() || null
  const fromSections = sectionExtraInstructions(persona.sections)
  const extraInstructions =
    [dslExtra, fromSections].filter(Boolean).join('\n\n').slice(0, 1000) || undefined

  const profile: AgentPersonaContext['profile'] = {}
  if (persona.bio?.trim()) profile.bio = persona.bio.trim()
  if (persona.location?.trim()) profile.location = persona.location.trim()
  if (persona.values.length) profile.values = persona.values
  if (persona.interests.length) profile.interests = persona.interests
  if (traits.length) profile.traits = traits
  if (painPoints.length) profile.painPoints = painPoints
  if (goals.length) profile.goals = goals
  if (persona.communicationStyle) profile.communicationStyle = persona.communicationStyle

  const out: AgentPersonaContext = {
    id: persona.id,
    name: persona.name,
    profile,
  }
  if (headline) out.headline = headline
  if (systemPrompt) out.systemPrompt = systemPrompt
  if (opts?.locale) out.locale = opts.locale
  if (overrides) out.dimensionOverrides = overrides
  if (dos.length) out.dos = dos
  if (donts.length) out.donts = donts
  if (extraInstructions) out.extraInstructions = extraInstructions
  return out
}

/** Load persona + chat system prompt and map to Agent PersonaContext. */
export async function resolveAgentPersonaContext(
  personaId: string,
  opts?: { locale?: string },
): Promise<AgentPersonaContext | { id: string } | null> {
  const id = personaId.trim()
  if (!id) return null
  const persona = await storePersonaDetail(id)
  if (!persona) return { id }
  let systemPrompt: string
  try {
    systemPrompt = await resolvePersonaSystemPrompt(id)
  } catch {
    systemPrompt = generateDefaultPersonaSystemPrompt(persona)
  }
  return toAgentPersonaContext(persona, {
    locale: opts?.locale ?? 'de',
    systemPrompt,
  })
}

export type PersonaPolicySnapshot = {
  dimensions?: Record<string, number> | null
  heuristics?: string[] | null
}

/** Quiet dock line, e.g. "Policy: detail↑ trust↑ · 4 heuristics". */
export function formatPersonaPolicySummary(
  policy: PersonaPolicySnapshot | null | undefined,
): string | null {
  if (!policy) return null
  const dims = policy.dimensions && typeof policy.dimensions === 'object' ? policy.dimensions : null
  const heuristics = Array.isArray(policy.heuristics) ? policy.heuristics : []
  const short: Record<string, string> = {
    risk_aversion: 'risk',
    time_pressure: 'time',
    exploration: 'explore',
    detail_orientation: 'detail',
    trust_skepticism: 'trust',
    accessibility_need: 'a11y',
  }
  const arrows: string[] = []
  if (dims) {
    for (const [key, label] of Object.entries(short)) {
      const v = dims[key]
      if (typeof v !== 'number' || !Number.isFinite(v)) continue
      if (v >= 0.66) arrows.push(`${label}↑`)
      else if (v <= 0.34) arrows.push(`${label}↓`)
    }
  }
  const h = heuristics.length
  if (!arrows.length && !h) return null
  const left = arrows.length ? arrows.join(' ') : 'neutral'
  return h ? `Policy: ${left} · ${h} heuristic${h === 1 ? '' : 's'}` : `Policy: ${left}`
}
