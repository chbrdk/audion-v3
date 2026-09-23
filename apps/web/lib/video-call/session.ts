/**
 * Create / end multi-provider video sessions.
 * Spec: specs/api/chat-video-session.md
 */

import type { ChatVideoSessionResponse, PersonaDetail } from '@audion-v3/contracts'
import { beyChatEmbedUrl } from '../bey/ids'
import { BeyApiError, createBeyLiveKitRoom } from '../bey/client'
import { syncPersonaBeyAgent } from '../bey/sync'
import {
  createTavusConversation,
  endTavusConversation,
  tavusConversationName,
  TavusApiError,
} from '../tavus/client'
import { personaTavusIds } from '../tavus/ids'
import {
  resolveTavusLanguage,
  tavusConversationLanguageName,
} from '../tavus/language'
import { tavusSessionConversationalContext } from '../tavus/prompt'
import { syncPersonaTavusPal } from '../tavus/sync'
import { resolveVideoCallProvider } from './resolve-provider'

export type VideoSessionError = {
  error: string
  status: number
  code?: string
  detail?: string
  personaId?: string
}

export async function createVideoSessionForPersona(
  persona: PersonaDetail,
): Promise<ChatVideoSessionResponse | VideoSessionError> {
  const resolved = resolveVideoCallProvider(persona)
  if (!resolved.ok) {
    return {
      error: resolved.error,
      status: resolved.status,
      code: resolved.code,
      personaId: persona.id,
    }
  }

  if (resolved.provider === 'bey') {
    return createBeySession(persona)
  }
  return createTavusSession(persona)
}

async function createBeySession(
  persona: PersonaDetail,
): Promise<ChatVideoSessionResponse | VideoSessionError> {
  const synced = await syncPersonaBeyAgent(persona)
  const working = synced.persona
  const agentId = working.beyAgentId?.trim()
  if (!agentId) {
    return {
      error: 'Persona has no Beyond Presence agent. Save a bey avatar id on the profile first.',
      status: 400,
      code: 'BEY_AGENT_MISSING',
      personaId: persona.id,
    }
  }
  try {
    const room = await createBeyLiveKitRoom({
      agentId,
      personaId: working.id,
      userName: working.name,
    })
    return {
      stubbed: false,
      provider: 'bey',
      personaId: working.id,
      conversationId: room.conversationId,
      media: {
        kind: 'livekit',
        url: room.livekitUrl,
        token: room.livekitToken,
      },
    }
  } catch (error) {
    if (error instanceof BeyApiError && error.code === 'BEY_LIVEKIT_PLAN') {
      return {
        stubbed: false,
        provider: 'bey',
        personaId: working.id,
        conversationId: null,
        media: { kind: 'iframe', url: beyChatEmbedUrl(agentId) },
      }
    }
    if (error instanceof BeyApiError) {
      return {
        error: error.message,
        status: error.status,
        code: error.code,
        detail: error.detail,
        personaId: working.id,
      }
    }
    return {
      error: error instanceof Error ? error.message : 'Beyond Presence session failed',
      status: 502,
      personaId: working.id,
    }
  }
}

async function createTavusSession(
  persona: PersonaDetail,
): Promise<ChatVideoSessionResponse | VideoSessionError> {
  const synced = await syncPersonaTavusPal(persona)
  const working = synced.persona
  const { replicaId, palId } = personaTavusIds(working)
  if (!replicaId && !palId) {
    return {
      error: 'Persona has no Tavus replica ID. Add one on the persona profile.',
      status: 400,
      code: 'TAVUS_REPLICA_MISSING',
      personaId: persona.id,
    }
  }
  const language = resolveTavusLanguage(working)
  try {
    const session = await createTavusConversation({
      replicaId,
      palId,
      conversationName: tavusConversationName(working.name),
      conversationalContext: tavusSessionConversationalContext(working.name, language),
      language: tavusConversationLanguageName(language),
    })
    return {
      stubbed: false,
      provider: 'tavus',
      personaId: working.id,
      conversationId: session.conversationId,
      media: {
        kind: 'iframe',
        url: session.conversationUrl,
        token: session.meetingToken,
      },
    }
  } catch (error) {
    if (error instanceof TavusApiError) {
      return {
        error: error.message,
        status: error.status,
        detail: error.detail,
        personaId: working.id,
      }
    }
    return {
      error: error instanceof Error ? error.message : 'Tavus session failed',
      status: 502,
      personaId: working.id,
    }
  }
}

export async function endVideoSession(input: {
  conversationId: string
  provider?: 'tavus' | 'bey' | null
}): Promise<{ ok: true; conversationId: string } | VideoSessionError> {
  const conversationId = input.conversationId.trim()
  if (!conversationId) {
    return { error: 'conversationId required', status: 400 }
  }
  const provider = input.provider === 'bey' ? 'bey' : 'tavus'
  if (provider === 'bey') {
    // LiveKit disconnect is client-side; BEY has no public end-room in Phase 1.
    return { ok: true, conversationId }
  }
  try {
    await endTavusConversation(conversationId)
    return { ok: true, conversationId }
  } catch (error) {
    if (error instanceof TavusApiError) {
      return { error: error.message, status: error.status, detail: error.detail }
    }
    return {
      error: error instanceof Error ? error.message : 'Tavus end failed',
      status: 502,
    }
  }
}
