import type { PersonaDetail } from '@audion-v3/contracts'
import { storePatchPersona } from '../fixtures/persona-store'
import { getTavusApiKey } from '../runtime-config'
import { TavusApiError } from './client'
import { upsertTavusPal } from './pals'

export type TavusPalSyncResult = {
  persona: PersonaDetail
  palId: string | null
  skipped: boolean
  created: boolean
  error?: string
}

/** Best-effort PAL upsert. Never throws — Audion save must still succeed. */
export async function syncPersonaTavusPal(persona: PersonaDetail): Promise<TavusPalSyncResult> {
  if (!persona.tavusReplicaId?.trim()) {
    return { persona, palId: persona.tavusPersonaId, skipped: true, created: false }
  }
  if (!getTavusApiKey()) {
    return { persona, palId: persona.tavusPersonaId, skipped: true, created: false }
  }
  try {
    const result = await upsertTavusPal(persona)
    if ('skipped' in result) {
      return { persona, palId: persona.tavusPersonaId, skipped: true, created: false }
    }
    if (result.palId === persona.tavusPersonaId) {
      return { persona, palId: result.palId, skipped: false, created: result.created }
    }
    const persisted =
      (await storePatchPersona(persona.id, { tavusPersonaId: result.palId })) ?? persona
    return { persona: persisted, palId: result.palId, skipped: false, created: result.created }
  } catch (error) {
    const message =
      error instanceof TavusApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Tavus PAL sync failed'
    return {
      persona,
      palId: persona.tavusPersonaId,
      skipped: false,
      created: false,
      error: message,
    }
  }
}
