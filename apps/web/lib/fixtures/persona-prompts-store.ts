/**
 * Persona chat system prompts facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 * Spec: specs/api/settings-persona-prompts.md
 */

import type { PersonaDetail } from '@audion-v3/contracts'
import { isProjectsDatabaseConfigured } from '../db/config'
import { ASSIST_TEMPLATES } from '../ai/prompts/templates'
import { substituteVars } from '../ai/prompts/render'
import { storePersonaDetail, storePersonaList } from './persona-store'

export const PERSONA_CHAT_PROMPT_VERSION = '2026-07-chat-v1'

export type PersonaPromptRecord = {
  personaId: string
  systemPrompt: string
  systemPromptDe: string | null
  templateVersion: string
  updatedAt: string
}

type Store = {
  byPersonaId: Map<string, PersonaPromptRecord>
}

const g = globalThis as unknown as { __audionPersonaPromptsStore?: Store }

function store(): Store {
  if (!g.__audionPersonaPromptsStore) {
    g.__audionPersonaPromptsStore = { byPersonaId: new Map() }
  }
  return g.__audionPersonaPromptsStore
}

async function dbApi() {
  return import('../db/persona-chat-prompts')
}

export function resetPersonaPromptsStore(): void {
  store().byPersonaId.clear()
}

/**
 * Sync default from base catalog `persona.chat_system_default` (no override).
 */
export function generateDefaultPersonaSystemPrompt(persona: PersonaDetail): string {
  const body = ASSIST_TEMPLATES['persona.chat_system_default'].prompt
  const rendered = substituteVars(body, {
    name: persona.name,
    role: persona.role,
    bio: persona.bio?.trim() || '',
    archetype: persona.archetype?.trim() || '',
    interests: persona.interests.join(', ') || 'n/a',
    values: persona.values.join(', ') || 'n/a',
  })
  return rendered
    .split('\n')
    .filter((line) => !/^Bio:\s*$/.test(line) && !/^Archetype:\s*$/.test(line))
    .join('\n')
}

export async function storeGetPersonaPromptRecord(
  personaId: string,
): Promise<PersonaPromptRecord | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetPersonaChatPrompt(personaId)
  }
  return store().byPersonaId.get(personaId) ?? null
}

export async function storeUpsertPersonaPrompt(
  personaId: string,
  patch: {
    systemPrompt: string
    systemPromptDe?: string | null
    templateVersion?: string | null
  },
): Promise<PersonaPromptRecord> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUpsertPersonaChatPrompt(personaId, patch)
  }
  const next: PersonaPromptRecord = {
    personaId,
    systemPrompt: patch.systemPrompt.trim(),
    systemPromptDe:
      patch.systemPromptDe === undefined
        ? (store().byPersonaId.get(personaId)?.systemPromptDe ?? null)
        : patch.systemPromptDe?.trim() || null,
    templateVersion: (patch.templateVersion || '').trim() || PERSONA_CHAT_PROMPT_VERSION,
    updatedAt: new Date().toISOString(),
  }
  store().byPersonaId.set(personaId, next)
  return next
}

export async function storeDeletePersonaPrompt(personaId: string): Promise<boolean> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeletePersonaChatPrompt(personaId)
  }
  return store().byPersonaId.delete(personaId)
}

export async function storeListPersonaPromptSummaries(): Promise<
  Array<{
    personaId: string
    name: string
    hasCustom: boolean
    updatedAt: string | null
  }>
> {
  const list = await storePersonaList()
  let customById: Map<string, PersonaPromptRecord>
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    customById = await db.dbGetPersonaChatPromptMap()
  } else {
    customById = store().byPersonaId
  }
  return list.items.map((p) => {
    const custom = customById.get(p.id)
    return {
      personaId: p.id,
      name: p.name,
      hasCustom: Boolean(custom),
      updatedAt: custom?.updatedAt ?? null,
    }
  })
}

export async function resolvePersonaSystemPrompt(personaId: string): Promise<string> {
  const custom = await storeGetPersonaPromptRecord(personaId)
  if (custom?.systemPrompt.trim()) return custom.systemPrompt
  const persona = await storePersonaDetail(personaId)
  if (!persona) {
    return 'You are a helpful audience research assistant speaking as a persona.'
  }
  return generateDefaultPersonaSystemPrompt(persona)
}
