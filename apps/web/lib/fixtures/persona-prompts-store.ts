/**
 * Fixture persona chat system prompts (until product Postgres).
 * Spec: specs/api/settings-persona-prompts.md
 */

import type { PersonaDetail } from '@audion-v3/contracts'
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

export function resetPersonaPromptsStore(): void {
  store().byPersonaId.clear()
}

/** Thin default matching pre-workspace chat native-stream. */
export function generateDefaultPersonaSystemPrompt(persona: PersonaDetail): string {
  return [
    `You are ${persona.name}, ${persona.role}.`,
    persona.bio ? `Bio: ${persona.bio}` : '',
    persona.archetype ? `Archetype: ${persona.archetype}` : '',
    `Interests: ${persona.interests.join(', ') || 'n/a'}`,
    `Values: ${persona.values.join(', ') || 'n/a'}`,
    'Answer in first person as this persona. Be concrete, magazine-brief, and evidence-minded.',
    'Use short markdown (## headings, lists) when helpful.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function storeGetPersonaPromptRecord(personaId: string): PersonaPromptRecord | null {
  return store().byPersonaId.get(personaId) ?? null
}

export function storeUpsertPersonaPrompt(
  personaId: string,
  patch: {
    systemPrompt: string
    systemPromptDe?: string | null
    templateVersion?: string | null
  },
): PersonaPromptRecord {
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

export function storeDeletePersonaPrompt(personaId: string): boolean {
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
  return list.items.map((p) => {
    const custom = store().byPersonaId.get(p.id)
    return {
      personaId: p.id,
      name: p.name,
      hasCustom: Boolean(custom),
      updatedAt: custom?.updatedAt ?? null,
    }
  })
}

export async function resolvePersonaSystemPrompt(personaId: string): Promise<string> {
  const custom = store().byPersonaId.get(personaId)
  if (custom?.systemPrompt.trim()) return custom.systemPrompt
  const persona = await storePersonaDetail(personaId)
  if (!persona) {
    return 'You are a helpful audience research assistant speaking as a persona.'
  }
  return generateDefaultPersonaSystemPrompt(persona)
}
