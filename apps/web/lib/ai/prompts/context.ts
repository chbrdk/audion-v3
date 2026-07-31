/**
 * Build string maps for assist templates (persona / journey).
 * Spec: specs/domain/prompt-templating.md
 */

import type { JourneyDetail, PersonaDetail } from '@audion-v3/contracts'
import { finalizeAssistVars } from './render'

function joinList(items: unknown, fallback = '(none)'): string {
  if (!Array.isArray(items) || items.length === 0) return fallback
  return items
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>
        return String(row.label || row.title || row.name || row.content || JSON.stringify(row))
      }
      return String(item)
    })
    .filter(Boolean)
    .join('; ')
}

export function personaProfileText(persona: PersonaDetail): string {
  return [
    `Name: ${persona.name}`,
    persona.role ? `Role: ${persona.role}` : null,
    persona.archetype ? `Archetype: ${persona.archetype}` : null,
    persona.bio ? `Bio: ${persona.bio}` : null,
    persona.interests?.length ? `Interests: ${persona.interests.join(', ')}` : null,
    persona.values?.length ? `Values: ${persona.values.join(', ')}` : null,
    persona.goals?.length ? `Goals: ${joinList(persona.goals)}` : null,
    persona.frustrations?.length ? `Frustrations: ${joinList(persona.frustrations)}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildPersonaAssistVars(
  persona: PersonaDetail,
  opts: {
    locale?: string
    maxItems?: number
    targetGroupSummary?: string
    extra?: Record<string, string>
  } = {},
): Record<string, string> {
  const traits =
    persona.traits && typeof persona.traits === 'object'
      ? Object.entries(persona.traits)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')
      : '(none)'
  return finalizeAssistVars({
    locale: opts.locale ?? 'en',
    max_items: String(opts.maxItems ?? 3),
    persona_profile: personaProfileText(persona),
    persona_name: persona.name,
    persona_headline: persona.role || persona.archetype || '',
    persona_bio: persona.bio || '',
    persona_segment: persona.archetype || persona.role || '',
    persona_interests: joinList(persona.interests),
    persona_values: joinList(persona.values),
    persona_goals: joinList(persona.goals),
    persona_pain_points: joinList(persona.frustrations),
    existing_traits: traits,
    existing_vocabulary: '(none)',
    target_group_summary: opts.targetGroupSummary ?? '(not provided)',
    knowledge_context: '(none)',
    graph_relationships_summary: '(none)',
    context: personaProfileText(persona),
    ...(opts.extra ?? {}),
  })
}

export function buildJourneyPhaseAssistVars(
  journey: JourneyDetail,
  phaseId: string,
  opts: {
    locale?: string
    maxItems?: number
    targetGroupSummary?: string
    personaSummaries?: string
    extra?: Record<string, string>
  } = {},
): Record<string, string> {
  const phase = journey.phases.find((p) => p.id === phaseId)
  return finalizeAssistVars({
    locale: opts.locale ?? 'en',
    max_items: String(opts.maxItems ?? 4),
    journey_name: journey.name,
    journey_type: journey.journeyType || 'customer',
    journey_description: journey.description || '',
    phase_name: phase?.name ?? '',
    phase_description: phase?.summary ?? '',
    phase_expected_emotion: 'neutral',
    target_group_summary:
      opts.targetGroupSummary ?? journey.targetGroupName ?? '(not provided)',
    persona_summaries: opts.personaSummaries ?? '(none)',
    context: `Phase: ${phase?.name ?? ''}\nSummary: ${phase?.summary ?? ''}\nExisting: ${(
      phase?.elements ?? []
    )
      .map((e) => e.label)
      .join('; ')}`,
    ...(opts.extra ?? {}),
  })
}
