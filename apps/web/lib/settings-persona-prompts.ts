/**
 * Settings Admin — persona chat prompt CRUD.
 * Spec: specs/api/settings-persona-prompts.md
 */

import type {
  SettingsPersonaPromptDetail,
  SettingsPersonaPromptListResponse,
  SettingsPersonaPromptUpdateRequest,
} from '@audion-v3/contracts'
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

export function listPersonaPrompts(): SettingsPersonaPromptListResponse {
  return { items: storeListPersonaPromptSummaries() }
}

export function getPersonaPromptDetail(
  personaId: string,
): SettingsPersonaPromptDetail | PersonaPromptsError {
  const persona = storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const custom = storeGetPersonaPromptRecord(personaId)
  return {
    personaId,
    name: persona.name,
    systemPrompt: custom?.systemPrompt ?? generateDefaultPersonaSystemPrompt(persona),
    systemPromptDe: custom?.systemPromptDe ?? null,
    templateVersion: custom?.templateVersion ?? PERSONA_CHAT_PROMPT_VERSION,
    hasCustom: Boolean(custom),
    updatedAt: custom?.updatedAt ?? null,
  }
}

export function updatePersonaPrompt(
  personaId: string,
  body: SettingsPersonaPromptUpdateRequest,
): SettingsPersonaPromptDetail | PersonaPromptsError {
  const persona = storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const systemPrompt = body.systemPrompt?.trim() || ''
  if (!systemPrompt) {
    return { error: 'systemPrompt is required', status: 400 }
  }
  storeUpsertPersonaPrompt(personaId, {
    systemPrompt,
    systemPromptDe: body.systemPromptDe,
    templateVersion: body.templateVersion,
  })
  return getPersonaPromptDetail(personaId) as SettingsPersonaPromptDetail
}

export function resetPersonaPrompt(
  personaId: string,
): SettingsPersonaPromptDetail | PersonaPromptsError {
  const persona = storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  storeDeletePersonaPrompt(personaId)
  return getPersonaPromptDetail(personaId) as SettingsPersonaPromptDetail
}

export { resolvePersonaSystemPrompt }
