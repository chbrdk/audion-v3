import type { PersonaDetail } from '@audion-v3/contracts'
import { storePatchPersona } from '../fixtures/persona-store'
import { paths } from '../paths'
import { getBeyApiKey } from '../runtime-config'
import { buildTavusPalSystemPrompt, tavusPalName } from '../tavus/prompt'
import { resolveTavusLanguage } from '../tavus/language'
import { BeyApiError, upsertBeyAgent } from './client'
import { trimBeyId } from './ids'

export type BeyAgentSyncResult = {
  persona: PersonaDetail
  agentId: string | null
  skipped: boolean
  created: boolean
  error?: string
}

/** Best-effort Managed Agent upsert. Never throws — Audion save must still succeed. */
export async function syncPersonaBeyAgent(persona: PersonaDetail): Promise<BeyAgentSyncResult> {
  const avatarId = trimBeyId(persona.beyAvatarId)
  if (!avatarId) {
    return { persona, agentId: persona.beyAgentId, skipped: true, created: false }
  }
  if (!getBeyApiKey()) {
    return { persona, agentId: persona.beyAgentId, skipped: true, created: false }
  }
  try {
    const language = resolveTavusLanguage(persona)
    const systemPrompt = buildTavusPalSystemPrompt(persona).slice(
      0,
      paths.beyAgentSystemPromptMaxChars,
    )
    const result = await upsertBeyAgent({
      name: tavusPalName(persona.name),
      avatarId,
      systemPrompt,
      language,
      agentId: persona.beyAgentId,
    })
    if (result.agentId === persona.beyAgentId) {
      return { persona, agentId: result.agentId, skipped: false, created: result.created }
    }
    const persisted =
      (await storePatchPersona(persona.id, { beyAgentId: result.agentId })) ?? persona
    return { persona: persisted, agentId: result.agentId, skipped: false, created: result.created }
  } catch (error) {
    const message =
      error instanceof BeyApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Beyond Presence agent sync failed'
    return {
      persona,
      agentId: persona.beyAgentId,
      skipped: false,
      created: false,
      error: message,
    }
  }
}
