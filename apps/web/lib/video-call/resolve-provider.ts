/**
 * Resolve Tavus vs Beyond Presence for a persona video call.
 * Spec: specs/domain/video-call-providers.md
 */

import type { ChatVideoCallProvider, PersonaDetail } from '@audion-v3/contracts'
import {
  getBeyApiKey,
  getTavusApiKey,
  getVideoCallProviderDefault,
} from '../runtime-config'
import { trimBeyId } from '../bey/ids'
import { trimTavusId } from '../tavus/ids'

export type VideoProviderResolution =
  | { ok: true; provider: ChatVideoCallProvider }
  | { ok: false; status: 400 | 503; code: string; error: string }

function parseExplicit(value: unknown): ChatVideoCallProvider | null {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (raw === 'tavus' || raw === 'bey') return raw
  return null
}

function beyReady(persona: PersonaDetail): boolean {
  return Boolean(getBeyApiKey() && (trimBeyId(persona.beyAvatarId) || trimBeyId(persona.beyAgentId)))
}

function tavusReady(persona: PersonaDetail): boolean {
  return Boolean(
    getTavusApiKey() &&
      (trimTavusId(persona.tavusReplicaId) || trimTavusId(persona.tavusPersonaId)),
  )
}

export function resolveVideoCallProvider(persona: PersonaDetail): VideoProviderResolution {
  const explicit = parseExplicit(persona.videoCallProvider)
  if (explicit === 'bey') {
    if (!getBeyApiKey()) {
      return {
        ok: false,
        status: 503,
        code: 'BEY_API_KEY_MISSING',
        error: 'BEY_API_KEY is not set',
      }
    }
    if (!trimBeyId(persona.beyAvatarId) && !trimBeyId(persona.beyAgentId)) {
      return {
        ok: false,
        status: 400,
        code: 'BEY_AVATAR_MISSING',
        error: 'Persona has no Beyond Presence avatar or agent ID. Add one on the persona profile.',
      }
    }
    return { ok: true, provider: 'bey' }
  }
  if (explicit === 'tavus') {
    if (!getTavusApiKey()) {
      return {
        ok: false,
        status: 503,
        code: 'TAVUS_API_KEY_MISSING',
        error: 'TAVUS_API_KEY is not set',
      }
    }
    if (!trimTavusId(persona.tavusReplicaId) && !trimTavusId(persona.tavusPersonaId)) {
      return {
        ok: false,
        status: 400,
        code: 'TAVUS_REPLICA_MISSING',
        error: 'Persona has no Tavus replica ID. Add one on the persona profile.',
      }
    }
    return { ok: true, provider: 'tavus' }
  }

  const bey = beyReady(persona)
  const tavus = tavusReady(persona)
  if (bey && !tavus) return { ok: true, provider: 'bey' }
  if (tavus && !bey) return { ok: true, provider: 'tavus' }
  if (bey && tavus) {
    return { ok: true, provider: getVideoCallProviderDefault() }
  }

  if (trimBeyId(persona.beyAvatarId) || trimBeyId(persona.beyAgentId)) {
    if (!getBeyApiKey()) {
      return {
        ok: false,
        status: 503,
        code: 'BEY_API_KEY_MISSING',
        error: 'BEY_API_KEY is not set',
      }
    }
  }
  if (trimTavusId(persona.tavusReplicaId) || trimTavusId(persona.tavusPersonaId)) {
    if (!getTavusApiKey()) {
      return {
        ok: false,
        status: 503,
        code: 'TAVUS_API_KEY_MISSING',
        error: 'TAVUS_API_KEY is not set',
      }
    }
  }

  return {
    ok: false,
    status: 400,
    code: 'VIDEO_PROVIDER_UNCONFIGURED',
    error:
      'No video provider configured. Add a Tavus replica or Beyond Presence avatar on the persona profile.',
  }
}
