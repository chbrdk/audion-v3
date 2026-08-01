/**
 * Server-only: load persona + system prompt, then map to Agent PersonaContext.
 * Do not import from client components (pulls persona-store → pg).
 */

import { generateDefaultPersonaSystemPrompt } from '../fixtures/persona-prompts-store'
import { storePersonaDetail } from '../fixtures/persona-store'
import { resolvePersonaSystemPrompt } from '../fixtures/persona-prompts-store'
import {
  toAgentPersonaContext,
  type AgentPersonaContext,
} from './persona-agent-context'

/** Load persona + chat system prompt and map to Agent PersonaContext. */
export async function resolveAgentPersonaContext(
  personaId: string,
  opts?: { locale?: string },
): Promise<AgentPersonaContext | { id: string } | null> {
  const id = personaId.trim()
  if (!id) return null
  const persona = await storePersonaDetail(id)
  if (!persona) return { id }
  let systemPrompt: string
  try {
    systemPrompt = await resolvePersonaSystemPrompt(id)
  } catch {
    systemPrompt = generateDefaultPersonaSystemPrompt(persona)
  }
  return toAgentPersonaContext(persona, {
    locale: opts?.locale ?? 'de',
    systemPrompt,
  })
}
