/**
 * Settings Admin — providers status + assist template list / test / override.
 * Spec: specs/api/settings-prompts.md · knowledge/settings-admin-2026.md
 */

import type {
  SettingsAssistPromptTestRequest,
  SettingsAssistPromptTestResponse,
  SettingsAssistPromptUpdateRequest,
  SettingsAssistTemplateSummary,
  SettingsAssistTemplatesResponse,
  SettingsProvidersResponse,
} from '@audion-v3/contracts'
import { getAiOpenAiModel, getAiOpenAiImageModel, hasOpenAiApiKey } from './ai/client'
import { runAssist } from './ai/assist'
import {
  getAssistTemplate,
  isAssistTemplateId,
  listAssistTemplateIds,
  resolvedUserBody,
  type AssistTemplateId,
} from './ai/prompts/templates'
import { finalizeAssistVars } from './ai/prompts/render'
import {
  deletePromptOverride,
  getPromptOverride,
  upsertPromptOverride,
} from './fixtures/prompt-overrides-store'
import { paths } from './paths'
import {
  getAiRuntime,
  getPersonaDataSource,
  isPlexonAuthConfigured,
  shouldPreferAiNative,
} from './runtime-config'

export function getSettingsProviders(): SettingsProvidersResponse {
  const openaiConfigured = hasOpenAiApiKey()
  const chatNative = shouldPreferAiNative()
  return {
    defaultProvider: 'openai',
    aiRuntime: getAiRuntime(),
    chatNative,
    personaDataSource: getPersonaDataSource(),
    plexonConfigured: isPlexonAuthConfigured(),
    providers: [
      {
        id: 'openai',
        label: 'OpenAI',
        model: getAiOpenAiModel(),
        configured: openaiConfigured,
        detail: openaiConfigured
          ? `Chat/workflows native when runtime prefers AI (${paths.envAiRuntime})`
          : `Set ${paths.envOpenAiApiKey} to enable native AI`,
      },
      {
        id: 'openai-image',
        label: 'OpenAI Image',
        model: getAiOpenAiImageModel(),
        configured: openaiConfigured,
        detail: 'Avatar / moodboard image generation',
      },
      {
        id: 'plexon',
        label: 'Plexon Auth',
        model: null,
        configured: isPlexonAuthConfigured(),
        detail: isPlexonAuthConfigured()
          ? 'Federation env present'
          : `Set ${paths.envPlexonAuthUrl} + ${paths.envPlexonServiceSecret}`,
      },
    ],
  }
}

function toSummary(id: AssistTemplateId): SettingsAssistTemplateSummary {
  const t = getAssistTemplate(id)
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    category: t.category,
    json: t.json,
    overridden: Boolean(getPromptOverride(id)),
    system: t.system,
    user: resolvedUserBody(t),
    prompt: t.prompt || '',
  }
}

export function listAssistTemplates(): SettingsAssistTemplatesResponse {
  return {
    templates: listAssistTemplateIds()
      .map(toSummary)
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
}

export function getAssistTemplateSummary(
  templateId: string,
): SettingsAssistTemplateSummary | { error: string; status: number } {
  if (!isAssistTemplateId(templateId)) {
    return { error: `Unknown templateId: ${templateId}`, status: 404 }
  }
  return toSummary(templateId)
}

export type SettingsAdminError = { error: string; status: number }

export function updateAssistTemplate(
  templateId: string,
  body: SettingsAssistPromptUpdateRequest,
): SettingsAssistTemplateSummary | SettingsAdminError {
  if (!isAssistTemplateId(templateId)) {
    return { error: `Unknown templateId: ${templateId}`, status: 404 }
  }
  const hasAny =
    body.system !== undefined || body.user !== undefined || body.prompt !== undefined
  if (!hasAny) {
    return { error: 'Provide system, user, and/or prompt', status: 400 }
  }
  upsertPromptOverride(templateId, {
    system: body.system,
    user: body.user,
    prompt: body.prompt,
  })
  return toSummary(templateId)
}

export function resetAssistTemplate(
  templateId: string,
): SettingsAssistTemplateSummary | SettingsAdminError {
  if (!isAssistTemplateId(templateId)) {
    return { error: `Unknown templateId: ${templateId}`, status: 404 }
  }
  deletePromptOverride(templateId)
  return toSummary(templateId)
}

export async function testAssistPrompt(
  body: SettingsAssistPromptTestRequest,
): Promise<SettingsAssistPromptTestResponse | SettingsAdminError> {
  const templateId = body.templateId?.trim() || ''
  if (!templateId) {
    return { error: 'templateId is required', status: 400 }
  }
  if (!isAssistTemplateId(templateId)) {
    return { error: `Unknown templateId: ${templateId}`, status: 400 }
  }

  const vars = finalizeAssistVars({
    locale: body.locale?.trim() || 'en',
    context: body.context?.trim() || 'Sample project context for prompt test.',
    persona_profile:
      body.persona_profile?.trim() ||
      'Name: Test Persona\nRole: Decision maker\nBio: Uses this product daily.',
    max_items: body.max_items?.trim() || '3',
    journey_name: 'Sample journey',
    journey_type: 'purchase',
    phase_name: 'Awareness',
    phase_description: 'User discovers the product.',
    phase_expected_emotion: 'hopeful',
    target_group_summary: 'Urban professionals, 30–45.',
    persona_summaries: 'Alex — research lead',
    persona_name: 'Test Persona',
    persona_headline: 'Decision maker',
    persona_bio: 'Uses this product daily.',
    persona_interests: '(none)',
    persona_values: '(none)',
    persona_goals: '(none)',
    persona_pain_points: '(none)',
    existing_traits: '(none)',
    existing_vocabulary: '(none)',
    knowledge_context: '(none)',
    graph_relationships_summary: '(none)',
    ...(body.vars ?? {}),
  })

  if (!shouldPreferAiNative()) {
    return {
      stubbed: true,
      templateId,
      text: JSON.stringify(
        {
          items: [
            {
              title: 'Stub suggestion',
              content: `Demo output for ${templateId} (AI stub mode)`,
            },
          ],
        },
        null,
        2,
      ),
      json: {
        items: [
          {
            title: 'Stub suggestion',
            content: `Demo output for ${templateId} (AI stub mode)`,
          },
        ],
      },
      suggestions: [
        {
          id: `${templateId}-stub-1`,
          title: 'Stub suggestion',
          description: `Demo output for ${templateId} (AI stub mode)`,
        },
      ],
    }
  }

  const result = await runAssist(templateId, vars, {
    system: body.system,
    prompt: body.prompt,
  })
  if ('error' in result) {
    return { error: result.detail || result.error, status: result.status || 502 }
  }
  return {
    stubbed: false,
    templateId,
    text: result.text,
    json: result.json,
    suggestions: result.suggestions,
  }
}
