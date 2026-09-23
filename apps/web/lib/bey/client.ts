/**
 * Beyond Presence REST client (Managed Agents + LiveKit rooms).
 * Spec: specs/domain/bey-video-chat.md
 */

import { paths } from '../paths'
import { getBeyApiBase, getBeyApiKey } from '../runtime-config'
import { trimBeyId } from './ids'

export class BeyApiError extends Error {
  status: number
  detail?: string
  code?: string

  constructor(message: string, status = 502, detail?: string, code?: string) {
    super(message)
    this.name = 'BeyApiError'
    this.status = status
    this.detail = detail
    this.code = code
  }
}

export type BeyAgentUpsertInput = {
  name: string
  avatarId: string
  systemPrompt: string
  language: 'de' | 'en'
  agentId?: string | null
}

export type BeyAgentUpsertResult = {
  agentId: string
  created: boolean
}

export type BeyLiveKitRoomResult = {
  conversationId: string
  livekitUrl: string
  livekitToken: string
}

async function beyFetch(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const apiKey = getBeyApiKey()
  if (!apiKey) {
    throw new BeyApiError('BEY_API_KEY is not set', 503, undefined, 'BEY_API_KEY_MISSING')
  }
  const url = `${getBeyApiBase().replace(/\/$/, '')}${path}`
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function readDetail(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  try {
    const json = JSON.parse(text) as { detail?: unknown; error?: string; message?: string }
    if (typeof json.detail === 'string') return json.detail
    if (Array.isArray(json.detail)) {
      return json.detail
        .map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
        .join('; ')
    }
    if (typeof json.error === 'string') return json.error
    if (typeof json.message === 'string') return json.message
  } catch {
    /* raw */
  }
  return text.slice(0, 400) || response.statusText
}

export function beyAgentPayload(input: BeyAgentUpsertInput): Record<string, unknown> {
  return {
    name: input.name.trim().slice(0, 100) || 'AUDION Persona',
    avatar_id: trimBeyId(input.avatarId),
    system_prompt: input.systemPrompt.trim().slice(0, paths.beyAgentSystemPromptMaxChars),
    language: input.language,
    max_session_length_minutes: paths.beyMaxSessionLengthMinutes,
  }
}

export async function upsertBeyAgent(input: BeyAgentUpsertInput): Promise<BeyAgentUpsertResult> {
  const avatarId = trimBeyId(input.avatarId)
  if (!avatarId) {
    throw new BeyApiError('beyAvatarId required', 400, undefined, 'BEY_AVATAR_MISSING')
  }
  const payload = beyAgentPayload({ ...input, avatarId })
  const existing = trimBeyId(input.agentId)
  if (existing) {
    const patch = await beyFetch('PATCH', `${paths.beyAgentsPath}/${encodeURIComponent(existing)}`, payload)
    if (patch.ok) {
      return { agentId: existing, created: false }
    }
    if (patch.status !== 404) {
      throw new BeyApiError(
        'Beyond Presence agent update failed',
        patch.status >= 400 && patch.status < 600 ? patch.status : 502,
        await readDetail(patch),
      )
    }
  }
  const create = await beyFetch('POST', paths.beyAgentsPath, payload)
  if (!create.ok) {
    throw new BeyApiError(
      'Beyond Presence agent create failed',
      create.status >= 400 && create.status < 600 ? create.status : 502,
      await readDetail(create),
    )
  }
  const json = (await create.json()) as { id?: string }
  const agentId = trimBeyId(json.id)
  if (!agentId) {
    throw new BeyApiError('Beyond Presence agent create returned no id', 502)
  }
  return { agentId, created: true }
}

export async function createBeyLiveKitRoom(input: {
  agentId: string
  personaId: string
  userName?: string | null
}): Promise<BeyLiveKitRoomResult> {
  const agentId = trimBeyId(input.agentId)
  if (!agentId) {
    throw new BeyApiError('beyAgentId required', 400, undefined, 'BEY_AGENT_MISSING')
  }
  const response = await beyFetch('POST', paths.beyLivekitRoomsPath, {
    agent_id: agentId,
    user_name: input.userName?.trim() || undefined,
    tags: {
      audion_persona_id: input.personaId.slice(0, 100),
      audion: '1',
    },
  })
  if (!response.ok) {
    const detail = await readDetail(response)
    const code =
      response.status === 403
        ? 'BEY_LIVEKIT_PLAN'
        : response.status === 429
          ? 'BEY_CONCURRENCY'
          : undefined
    throw new BeyApiError(
      'Beyond Presence LiveKit room failed',
      response.status >= 400 && response.status < 600 ? response.status : 502,
      detail,
      code,
    )
  }
  const json = (await response.json()) as {
    id?: string
    livekit_url?: string
    livekit_token?: string
  }
  const conversationId = trimBeyId(json.id)
  const livekitUrl = trimBeyId(json.livekit_url)
  const livekitToken = trimBeyId(json.livekit_token)
  if (!conversationId || !livekitUrl || !livekitToken) {
    throw new BeyApiError('Beyond Presence LiveKit room incomplete response', 502)
  }
  return { conversationId, livekitUrl, livekitToken }
}
