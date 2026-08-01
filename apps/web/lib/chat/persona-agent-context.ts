/**
 * Pure helpers: product PersonaDetail → Agent PersonaContext (+ policy dock line).
 * Keep this module free of persona-store / pg so client components can import it.
 */

import type {
  PersonaDetail,
  PersonaJourneyDimensions,
  PersonaSection,
} from '@audion-v3/contracts'

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
    channels?: string[]
    attentionSpan?: string
    confidence?: number
    techLiteracy?: number
    motivations?: Array<{ label: string; type?: string | null }>
    emotionalBaseline?: string
    stressTriggers?: string[]
    priorKnowledge?: Array<{ title: string; content: string }>
    communicationStyle?: PersonaDetail['communicationStyle']
  }
  dimensionOverrides?: Record<string, number>
  dos?: string[]
  donts?: string[]
  heuristics?: string[]
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

const SECTION_PRIORITY = /^(mindset|working with)/i
const PRIOR_KNOWLEDGE_CAP = 4
const PRIOR_KNOWLEDGE_CONTENT_LIMIT = 400

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function traitsToList(traits: Record<string, number>): string[] {
  return Object.entries(traits)
    .filter(([k]) => k.trim())
    .map(([k, v]) => `${k}: ${clamp01(v).toFixed(2)}`)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** All sections into extraInstructions; Mindset / Working-with first. */
function sectionExtraInstructions(sections: PersonaSection[]): string | null {
  const prioritized = [...sections].sort((a, b) => {
    const ap = SECTION_PRIORITY.test((a.title || '').trim()) ? 0 : 1
    const bp = SECTION_PRIORITY.test((b.title || '').trim()) ? 0 : 1
    return ap - bp
  })
  const parts = prioritized
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

function priorKnowledgeFromPersona(
  persona: PersonaDetail,
): Array<{ title: string; content: string }> | undefined {
  const entries = (persona.knowledgeEntries ?? [])
    .map((e) => {
      const title = (e.title || '').trim()
      const content = stripHtml(e.content || '').slice(0, PRIOR_KNOWLEDGE_CONTENT_LIMIT)
      if (!title || !content) return null
      return { title, content }
    })
    .filter((x): x is { title: string; content: string } => Boolean(x))
    .slice(0, PRIOR_KNOWLEDGE_CAP)
  return entries.length ? entries : undefined
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
  const heuristics = (jb?.heuristics ?? []).map((h) => h.trim()).filter(Boolean).slice(0, 8)
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
  if (persona.channels.length) profile.channels = persona.channels
  if (persona.attentionSpan?.trim()) profile.attentionSpan = persona.attentionSpan.trim()
  if (typeof persona.confidence === 'number' && Number.isFinite(persona.confidence)) {
    profile.confidence = clamp01(persona.confidence)
  }
  if (typeof persona.techLiteracy === 'number' && Number.isFinite(persona.techLiteracy)) {
    profile.techLiteracy = clamp01(persona.techLiteracy)
  }
  if (persona.motivations?.length) {
    profile.motivations = persona.motivations
      .map((m) => ({ label: m.label.trim(), type: m.type ?? null }))
      .filter((m) => m.label)
  }
  if (persona.emotionalBaseline?.trim()) {
    profile.emotionalBaseline = persona.emotionalBaseline.trim()
  }
  if (persona.stressTriggers?.length) {
    profile.stressTriggers = persona.stressTriggers.map((s) => s.trim()).filter(Boolean)
  }
  const priorKnowledge = priorKnowledgeFromPersona(persona)
  if (priorKnowledge) profile.priorKnowledge = priorKnowledge
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
  if (heuristics.length) out.heuristics = heuristics
  if (extraInstructions) out.extraInstructions = extraInstructions
  return out
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
