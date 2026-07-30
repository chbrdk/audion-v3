/**
 * Prompt templates for native AiAssist (ported conceptually from V2 templates.yaml).
 */

export type AssistTemplateId =
  | 'persona.interests'
  | 'persona.values'
  | 'persona.goals'
  | 'persona.pain_points'
  | 'persona.traits'
  | 'persona.vocabulary'
  | 'persona.sentence_structure'
  | 'project.suggest_target_groups'
  | 'target_group.suggest_personas'
  | 'journey.moments'
  | 'journey.full_generation'
  | 'journey.validate_chat'
  | 'persona.generate_batch'
  | 'persona.enrich_facets'
  | 'moodboard.style_keywords'
  | 'research.synthesize'
  | 'ux_study.run_summary'

export type AssistTemplate = {
  id: AssistTemplateId
  system: string
  user: string
  /** Prefer JSON array/object parse */
  json: boolean
}

const LOCALE = '{{locale}}'
const PROFILE = '{{persona_profile}}'
const MAX = '{{max_items}}'
const CONTEXT = '{{context}}'

export const ASSIST_TEMPLATES: Record<AssistTemplateId, AssistTemplate> = {
  'persona.interests': {
    id: 'persona.interests',
    json: true,
    system: `You suggest concise interest chips for a persona magazine. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} fresh interests not already listed. Avoid duplicates.`,
  },
  'persona.values': {
    id: 'persona.values',
    json: true,
    system: `You suggest core values as short chips. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} values.`,
  },
  'persona.goals': {
    id: 'persona.goals',
    json: true,
    system: `You suggest actionable persona goals. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} goals.`,
  },
  'persona.pain_points': {
    id: 'persona.pain_points',
    json: true,
    system: `You suggest frustrations / pain points. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} frustrations.`,
  },
  'persona.traits': {
    id: 'persona.traits',
    json: true,
    system: `You suggest personality trait labels (single words or short phrases). Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} traits.`,
  },
  'persona.vocabulary': {
    id: 'persona.vocabulary',
    json: true,
    system: `You suggest vocabulary words this persona would use. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} vocabulary chips.`,
  },
  'persona.sentence_structure': {
    id: 'persona.sentence_structure',
    json: true,
    system: `You suggest how this persona structures sentences (style notes). Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","description":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nSuggest up to ${MAX} sentence-structure notes.`,
  },
  'project.suggest_target_groups': {
    id: 'project.suggest_target_groups',
    json: true,
    system: `You suggest target-group segments for a research project. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","subtitle":"...","description":"..."}]}`,
    user: `Project context:\n${CONTEXT}\n\nSuggest up to ${MAX} target groups.`,
  },
  'target_group.suggest_personas': {
    id: 'target_group.suggest_personas',
    json: true,
    system: `You suggest named personas for a target group. Locale: ${LOCALE}. Return JSON: {"items":[{"title":"...","subtitle":"...","description":"..."}]}`,
    user: `Target group:\n${CONTEXT}\n\nSuggest up to ${MAX} personas (name + role).`,
  },
  'journey.moments': {
    id: 'journey.moments',
    json: true,
    system: `You generate journey phase moments (action/thought/feeling/pain/opportunity). Locale: ${LOCALE}. Return JSON: {"moments":[{"kind":"action|thought|feeling|pain|opportunity","label":"..."}]}`,
    user: `Journey phase:\n${CONTEXT}\n\nGenerate up to ${MAX} moments.`,
  },
  'journey.full_generation': {
    id: 'journey.full_generation',
    json: true,
    system: `You generate a customer journey with 3–5 phases. Locale: ${LOCALE}. Return JSON: {"name":"...","description":"...","phases":[{"name":"...","summary":"...","elements":[{"kind":"action|thought|feeling|pain|opportunity","label":"..."}]}]}`,
    user: `Generate a journey from:\n${CONTEXT}`,
  },
  'journey.validate_chat': {
    id: 'journey.validate_chat',
    json: true,
    system: `You are the persona validating a journey map in chat mode. Locale: ${LOCALE}. Return JSON: {"phaseQuotes":[{"phaseId":"...","personaQuote":"...","friction":"...","recommendation":"..."}]}`,
    user: `Persona:\n${PROFILE}\n\nJourney phases to react to:\n${CONTEXT}\n\nSpeak in first person as the persona. One entry per phaseId.`,
  },
  'persona.generate_batch': {
    id: 'persona.generate_batch',
    json: true,
    system: `You generate draft personas for a target group. Locale: ${LOCALE}. Return JSON: {"personas":[{"name":"...","role":"...","archetype":"...","bio":"...","interests":["..."]}]}`,
    user: `Target group:\n${CONTEXT}\n\nGenerate exactly ${MAX} personas.`,
  },
  'persona.enrich_facets': {
    id: 'persona.enrich_facets',
    json: true,
    system: `You enrich a persona magazine brief. Locale: ${LOCALE}. Return JSON: {"interests":["..."],"values":["..."],"goals":[{"label":"..."}],"frustrations":[{"label":"..."}],"traits":{"TraitName":0.0-1.0}}`,
    user: `Enrich this persona (keep existing signal, add depth):\n${PROFILE}`,
  },
  'moodboard.style_keywords': {
    id: 'moodboard.style_keywords',
    json: true,
    system: `You invent visual moodboard style keywords for a persona. Locale: ${LOCALE}. Return JSON: {"styleKeywords":["..."],"tileCaptions":["..."]}`,
    user: `Persona:\n${PROFILE}\n\nContext: ${CONTEXT}`,
  },
  'research.synthesize': {
    id: 'research.synthesize',
    json: true,
    system: `You synthesize project research from crawled page text. Locale: ${LOCALE}. Return JSON: {"title":"...","summary":"...","sections":[{"heading":"...","body":"..."}],"citations":[{"url":"...","note":"..."}]}`,
    user: `Seed URL and page extracts:\n${CONTEXT}`,
  },
  'ux_study.run_summary': {
    id: 'ux_study.run_summary',
    json: true,
    system: `You simulate a UX journey agent observation for one persona run. Locale: ${LOCALE}. Return JSON: {"outcome":"pass|fail|partial","summary":"...","findings":[{"severity":"high|medium|low","title":"...","detail":"..."}],"quotes":["..."]}`,
    user: `Study / wave / persona run context:\n${CONTEXT}`,
  },
}

export function renderTemplate(
  template: AssistTemplate,
  vars: Record<string, string>,
): { system: string; user: string } {
  const fill = (text: string) =>
    text
      .replaceAll('{{locale}}', vars.locale ?? 'en')
      .replaceAll('{{persona_profile}}', vars.persona_profile ?? '')
      .replaceAll('{{max_items}}', vars.max_items ?? '3')
      .replaceAll('{{context}}', vars.context ?? '')
  return { system: fill(template.system), user: fill(template.user) }
}
