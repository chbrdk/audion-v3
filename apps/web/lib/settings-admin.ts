/**
 * Settings Admin — providers status + assist template list / test.
 * Spec: knowledge/settings-admin-2026.md
 */

import type {
  SettingsAssistPromptTestRequest,
  SettingsAssistPromptTestResponse,
  SettingsAssistTemplatesResponse,
  SettingsProvidersResponse,
} from '@audion-v3/contracts'
import { getAiOpenAiModel, getAiOpenAiImageModel, hasOpenAiApiKey } from './ai/client'
import { runAssist } from './ai/assist'
import {
  ASSIST_TEMPLATES,
  type AssistTemplateId,
} from './ai/prompts/templates'
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

export function listAssistTemplates(): SettingsAssistTemplatesResponse {
  return {
    templates: Object.values(ASSIST_TEMPLATES).map((t) => ({
      id: t.id,
      json: t.json,
    })),
  }
}

function isAssistTemplateId(id: string): id is AssistTemplateId {
  return id in ASSIST_TEMPLATES
}

export type SettingsAdminError = { error: string; status: number }

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

  const vars: Record<string, string> = {
    locale: body.locale?.trim() || 'en',
    context: body.context?.trim() || 'Sample project context for prompt test.',
    persona_profile:
      body.persona_profile?.trim() ||
      'Name: Test Persona\nRole: Decision maker\nBio: Uses this product daily.',
    max_items: body.max_items?.trim() || '3',
  }

  if (!shouldPreferAiNative()) {
    return {
      stubbed: true,
      templateId,
      text: JSON.stringify(
        {
          items: [
            {
              title: 'Stub suggestion',
              description: `Demo output for ${templateId} (AI stub mode)`,
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
            description: `Demo output for ${templateId} (AI stub mode)`,
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

  const result = await runAssist(templateId, vars)
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
