/**
 * Prompt templates for native AiAssist.
 * V2 YAML bodies via v2-ported.ts; V3-only ids kept here.
 * Spec: specs/domain/prompt-templating.md
 */

import {
  getPromptOverride,
  type AssistTemplateOverridePayload,
} from '../../fixtures/prompt-overrides-store'
import {
  appendLocaleOutputGuard,
  finalizeAssistVars,
  substituteVars,
} from './render'
import { AUDION_ASSIST_SYSTEM } from './system'
import { V2_PORTED_TEMPLATES } from './v2-ported'

export type AssistTemplateId =
  | 'persona.interests'
  | 'persona.values'
  | 'persona.goals'
  | 'persona.pain_points'
  | 'persona.traits'
  | 'persona.vocabulary'
  | 'persona.sentence_structure'
  | 'persona.geo_questions'
  | 'persona.build_chat_prompt'
  | 'persona.translate_chat_system_prompt_de'
  | 'persona.translate_profile_json_de'
  | 'persona.chat_system_default'
  | 'project.suggest_target_groups'
  | 'target_group.suggest_personas'
  | 'journey.moments'
  | 'journey.description'
  | 'journey.phase.create'
  | 'journey.phase.name'
  | 'journey.phase.emotion'
  | 'journey.full_generation'
  | 'journey.from_ux_run'
  | 'journey.validate_chat'
  | 'persona.generate_batch'
  | 'persona.enrich_facets'
  | 'persona.derive_agent_profile'
  | 'moodboard.style_keywords'
  | 'research.synthesize'
  | 'ux_study.run_summary'

export type AssistTemplate = {
  id: AssistTemplateId
  label: string
  description: string
  category: string
  system: string
  /** Optional dual-message user body (legacy v3). */
  user: string
  /** V2 single-body prompt — preferred when set; rendered as user message. */
  prompt: string
  json: boolean
}

function fromV2(id: AssistTemplateId): AssistTemplate {
  const t = V2_PORTED_TEMPLATES[id]
  if (!t) throw new Error(`Missing V2 port for ${id}`)
  return {
    id,
    label: t.label,
    description: t.description,
    category: t.category,
    system: t.system,
    user: '',
    prompt: t.prompt,
    json: t.json,
  }
}

/** V3-only templates (not in V2 YAML) — use ${var} syntax. */
const V3_EXTRA: Partial<Record<AssistTemplateId, AssistTemplate>> = {
  'persona.chat_system_default': {
    id: 'persona.chat_system_default',
    label: 'Persona chat system (default)',
    description:
      'Catalog stub only — runtime chat uses buildAdaptivePersonaChatSystemPrompt from PersonaDetail (traits/style/goals). Do not treat this template as the live system prompt.',
    category: 'persona',
    json: false,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `You are \${name}, \${role}.
Bio: \${bio}
Archetype: \${archetype}
Interests: \${interests}
Values: \${values}
[Deprecated as sole chat body — adaptive assembly in adaptive-persona-chat-prompt.ts is SSOT.]
Answer in first person as this persona. Be concrete, magazine-brief, and evidence-minded.`,
  },
  'project.suggest_target_groups': {
    id: 'project.suggest_target_groups',
    label: 'Suggest target groups',
    description: 'Suggest target-group segments for a research project.',
    category: 'project',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Suggest up to \${max_items} target-group segments for this project.

PROJECT CONTEXT:
\${context}

FORMAT:
{"items":[{"title":"...","subtitle":"...","description":"..."}]}`,
  },
  'target_group.suggest_personas': {
    id: 'target_group.suggest_personas',
    label: 'Suggest personas',
    description: 'Suggest named personas for a target group.',
    category: 'target_group',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Suggest up to \${max_items} personas (name + role) for this target group.

TARGET GROUP:
\${context}

FORMAT:
{"items":[{"title":"...","subtitle":"...","description":"..."}]}`,
  },
  'journey.validate_chat': {
    id: 'journey.validate_chat',
    label: 'Journey validate (chat mode)',
    description: 'Persona first-person reactions to journey phases.',
    category: 'journey',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: Quotes and recommendations in \${generated_text_locale_name}.

You are the persona validating a journey map in chat mode.
Speak in first person as the persona. One entry per phaseId.

PERSONA:
\${persona_profile}

JOURNEY PHASES:
\${context}

FORMAT:
{"phaseQuotes":[{"phaseId":"...","personaQuote":"...","friction":"...","recommendation":"..."}]}`,
  },
  'persona.generate_batch': {
    id: 'persona.generate_batch',
    label: 'Generate persona batch',
    description: 'Draft personas for a target group.',
    category: 'persona',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Generate exactly \${max_items} draft personas for this target group.

TARGET GROUP:
\${context}

TRAIT RULES (critical):
- Each persona needs 5–8 traits as English PascalCase or snake_case keys with scores 0.0–1.0.
- Trait scores must reflect THIS persona's role, segment, and decision style — not generic B2B defaults.
- Do NOT reuse the same top trait or near-identical score set across personas in this response.
- Vary which traits dominate (e.g. one risk-averse buyer vs one impatient innovator vs one detail-driven specialist).
- Prefer concrete behavioral traits (e.g. Skeptical, TimePressed, DetailOriented, Collaborative, StatusDriven) over vague labels.
- Never copy example numbers; invent scores that fit the person.

FORMAT:
{"personas":[{"name":"...","role":"...","archetype":"...","headline":"...","bio":"...","interests":["..."],"goals":[{"label":"...","priority":1}],"frustrations":[{"label":"..."}],"traits":{"TraitA":0.0,"TraitB":0.0,"TraitC":0.0,"TraitD":0.0,"TraitE":0.0}}]}`,
  },
  'persona.enrich_facets': {
    id: 'persona.enrich_facets',
    label: 'Enrich persona facets',
    description: 'Enrich magazine persona brief (interests, values, goals, traits).',
    category: 'persona',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Enrich this persona (keep existing signal, add depth):

\${persona_profile}

TRAIT RULES (critical):
- Return 5–8 traits as English PascalCase or snake_case keys with scores 0.0–1.0.
- Scores must differentiate this persona's decision style; avoid flat mid scores and generic defaults like Pragmatic≈0.82 / Analytical≈0.7 for everyone.
- Keep strong existing traits if present, then add complementary traits that deepen the brief.

FORMAT:
{"interests":["..."],"values":["..."],"goals":[{"label":"..."}],"frustrations":[{"label":"..."}],"traits":{"TraitA":0.0,"TraitB":0.0,"TraitC":0.0,"TraitD":0.0,"TraitE":0.0}}`,
  },
  'persona.derive_agent_profile': {
    id: 'persona.derive_agent_profile',
    label: 'Derive UX agent profile',
    description:
      'Derive research profile + journey behaviour knobs from traits, goals, and frustrations.',
    category: 'persona',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Derive soft UX-agent controls from this magazine persona. Ground every field in traits, goals, values, and frustrations — do not invent a different person.

PERSONA:
\${persona_profile}

EXISTING TRAITS (scores 0..1):
\${existing_traits}

Return JSON only:
{
  "techLiteracy": 0.0,
  "emotionalBaseline": "short affect label",
  "stressTriggers": ["..."],
  "motivations": [{"label":"...","type":"intrinsic"}],
  "journeyBehavior": {
    "dimensionOverrides": {
      "riskAversion": 0.0,
      "timePressure": 0.0,
      "exploration": 0.0,
      "detailOrientation": 0.0,
      "trustSkepticism": 0.0,
      "accessibilityNeed": 0.0
    },
    "dos": ["..."],
    "donts": ["..."],
    "heuristics": ["..."],
    "extraInstructions": "one short paragraph"
  }
}

All dimension values must be between 0 and 1.`,
  },
  'moodboard.style_keywords': {
    id: 'moodboard.style_keywords',
    label: 'Moodboard style keywords',
    description: 'Visual moodboard style keywords and tile captions.',
    category: 'persona',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: Keywords/captions in \${generated_text_locale_name}.

Invent visual moodboard style keywords for this persona.

PERSONA:
\${persona_profile}

CONTEXT:
\${context}

FORMAT:
{"styleKeywords":["..."],"tileCaptions":["..."]}`,
  },
  'research.synthesize': {
    id: 'research.synthesize',
    label: 'Research synthesize',
    description: 'Synthesize project research from crawled page text.',
    category: 'project',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Synthesize project research from crawled page text.

SEED URL AND EXTRACTS:
\${context}

FORMAT:
{"title":"...","summary":"...","sections":[{"heading":"...","body":"..."}],"citations":[{"url":"...","note":"..."}]}`,
  },
  'ux_study.run_summary': {
    id: 'ux_study.run_summary',
    label: 'UX study run summary',
    description: 'Simulate UX journey agent observation for one persona run.',
    category: 'ux_study',
    json: true,
    system: AUDION_ASSIST_SYSTEM,
    user: '',
    prompt: `LANGUAGE: All user-visible strings must be in \${generated_text_locale_name}.

Simulate a UX journey agent observation for one persona run.

STUDY / WAVE / PERSONA RUN:
\${context}

FORMAT:
{"outcome":"pass|fail|partial","summary":"...","findings":[{"severity":"high|medium|low","title":"...","detail":"..."}],"quotes":["..."]}`,
  },
}

const V2_IDS: AssistTemplateId[] = [
  'journey.moments',
  'journey.description',
  'persona.pain_points',
  'persona.goals',
  'persona.geo_questions',
  'persona.interests',
  'persona.values',
  'persona.traits',
  'persona.vocabulary',
  'persona.sentence_structure',
  'persona.build_chat_prompt',
  'persona.translate_chat_system_prompt_de',
  'persona.translate_profile_json_de',
  'journey.phase.create',
  'journey.full_generation',
  'journey.from_ux_run',
  'journey.phase.name',
  'journey.phase.emotion',
]

function buildBaseCatalog(): Record<AssistTemplateId, AssistTemplate> {
  const catalog = {} as Record<AssistTemplateId, AssistTemplate>
  for (const id of V2_IDS) {
    catalog[id] = fromV2(id)
  }
  for (const [id, t] of Object.entries(V3_EXTRA) as Array<[AssistTemplateId, AssistTemplate]>) {
    catalog[id] = t
  }
  return catalog
}

export const ASSIST_TEMPLATES: Record<AssistTemplateId, AssistTemplate> = buildBaseCatalog()

export function isAssistTemplateId(id: string): id is AssistTemplateId {
  return id in ASSIST_TEMPLATES
}

function applyOverride(
  base: AssistTemplate,
  override: AssistTemplateOverridePayload | null,
): AssistTemplate {
  if (!override) return base
  return {
    ...base,
    system: override.system != null && override.system !== '' ? override.system : base.system,
    user: override.user != null ? override.user : base.user,
    prompt: override.prompt != null && override.prompt !== '' ? override.prompt : base.prompt,
  }
}

export async function getAssistTemplate(templateId: AssistTemplateId): Promise<AssistTemplate> {
  return applyOverride(ASSIST_TEMPLATES[templateId], await getPromptOverride(templateId))
}

export function listAssistTemplateIds(): AssistTemplateId[] {
  return Object.keys(ASSIST_TEMPLATES) as AssistTemplateId[]
}

/** Resolved user body: prefer `prompt` (V2), else `user`. */
export function resolvedUserBody(template: AssistTemplate): string {
  return (template.prompt || template.user || '').trim()
}

/**
 * Render system + user with ${}/{‌{}} vars and locale footer on the user body.
 */
export function renderTemplate(
  template: AssistTemplate,
  vars: Record<string, string>,
): { system: string; user: string } {
  const safe = finalizeAssistVars(vars)
  const system = substituteVars(template.system, safe)
  const body = substituteVars(resolvedUserBody(template), safe)
  const user = appendLocaleOutputGuard(body, safe.output_locale)
  return { system, user }
}
