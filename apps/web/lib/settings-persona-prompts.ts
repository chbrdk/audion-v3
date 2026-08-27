/**
 * Settings Admin — persona chat prompt CRUD.
 * Spec: specs/api/settings-persona-prompts.md
 */

import type {
  SettingsPersonaPromptDetail,
  SettingsPersonaPromptListResponse,
  SettingsPersonaPromptUpdateRequest,
} from '@audion-v3/contracts'
import { buildAdaptivePersonaChatSystemPrompt } from './chat/adaptive-persona-chat-prompt'
import { storePersonaDetail } from './fixtures/persona-store'
import {
  generateDefaultPersonaSystemPrompt,
  PERSONA_CHAT_PROMPT_VERSION,
  resolvePersonaSystemPrompt,
  storeDeletePersonaPrompt,
  storeGetPersonaPromptRecord,
  storeListPersonaPromptSummaries,
  storeUpsertPersonaPrompt,
} from './fixtures/persona-prompts-store'

export type PersonaPromptsError = { error: string; status: number }

export async function listPersonaPrompts(): Promise<SettingsPersonaPromptListResponse> {
  return { items: await storeListPersonaPromptSummaries() }
}

export async function getPersonaPromptDetail(
  personaId: string,
): Promise<SettingsPersonaPromptDetail | PersonaPromptsError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const custom = await storeGetPersonaPromptRecord(personaId)
  const customVoice = custom?.systemPrompt?.trim() || ''
  const adaptiveProfilePrompt = generateDefaultPersonaSystemPrompt(persona)
  const resolvedSystemPrompt = buildAdaptivePersonaChatSystemPrompt(persona, {
    customVoice: customVoice || undefined,
  })
  return {
    personaId,
    name: persona.name,
    systemPrompt: customVoice,
    adaptiveProfilePrompt,
    resolvedSystemPrompt,
    systemPromptDe: custom?.systemPromptDe ?? null,
    templateVersion: custom?.templateVersion ?? PERSONA_CHAT_PROMPT_VERSION,
    hasCustom: Boolean(custom),
    updatedAt: custom?.updatedAt ?? null,
  }
}

export async function updatePersonaPrompt(
  personaId: string,
  body: SettingsPersonaPromptUpdateRequest,
): Promise<SettingsPersonaPromptDetail | PersonaPromptsError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const systemPrompt = body.systemPrompt?.trim() || ''
  if (!systemPrompt) {
    return { error: 'systemPrompt is required', status: 400 }
  }
  await storeUpsertPersonaPrompt(personaId, {
    systemPrompt,
    systemPromptDe: body.systemPromptDe,
    templateVersion: body.templateVersion,
  })
  return (await getPersonaPromptDetail(personaId)) as SettingsPersonaPromptDetail
}

export async function resetPersonaPrompt(
  personaId: string,
): Promise<SettingsPersonaPromptDetail | PersonaPromptsError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  await storeDeletePersonaPrompt(personaId)
  return (await getPersonaPromptDetail(personaId)) as SettingsPersonaPromptDetail
}

export { resolvePersonaSystemPrompt }
