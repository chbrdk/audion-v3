import { paths } from '../paths'
import { getTavusApiBase, getTavusApiKey } from '../runtime-config'
import { trimTavusId } from './ids'

export type TavusConversationPayload = {
  replica_id?: string
  face_id?: string
  persona_id?: string
  pal_id?: string
  conversation_name?: string
  conversational_context?: string
}

export type TavusConversationResult = {
  conversationUrl: string
  conversationId: string | null
  meetingToken: string | null
}

export class TavusApiError extends Error {
  status: number
  detail?: string

  constructor(message: string, status = 502, detail?: string) {
    super(message)
    this.name = 'TavusApiError'
    this.status = status
    this.detail = detail
  }
}

export function buildTavusConversationPayload(input: {
  replicaId?: string | null
  palId?: string | null
  conversationName?: string | null
  conversationalContext?: string | null
}): TavusConversationPayload {
  const replicaId = trimTavusId(input.replicaId)
  const palId = trimTavusId(input.palId)
  const payload: TavusConversationPayload = {}
  if (replicaId) {
    payload.replica_id = replicaId
    payload.face_id = replicaId
  }
  if (palId) {
    payload.persona_id = palId
    payload.pal_id = palId
  }
  const name = trimTavusId(input.conversationName)
  if (name) payload.conversation_name = name
  const context = trimTavusId(input.conversationalContext)
  if (context) payload.conversational_context = context.slice(0, 1500)
  return payload
}

export function tavusConversationsUrl(base = getTavusApiBase()): string {
  return `${base.replace(/\/$/, '')}${paths.tavusConversationsPath}`
}

export async function createTavusConversation(input: {
  replicaId?: string | null
  palId?: string | null
  conversationName?: string | null
  conversationalContext?: string | null
}): Promise<TavusConversationResult> {
  const apiKey = getTavusApiKey()
  if (!apiKey) {
    throw new TavusApiError('Tavus is not configured (TAVUS_API_KEY)', 503)
  }
  const payload = buildTavusConversationPayload(input)
  if (!payload.face_id && !payload.pal_id) {
    throw new TavusApiError('Persona has no Tavus replica ID', 400)
  }

  const response = await fetch(tavusConversationsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const text = await response.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = { raw: text }
  }
  if (!response.ok) {
    const detail =
      typeof json.message === 'string'
        ? json.message
        : typeof json.error === 'string'
          ? json.error
          : text.slice(0, 240)
    throw new TavusApiError(`Tavus conversation failed (${response.status})`, response.status, detail)
  }
  const conversationUrl = String(json.conversation_url ?? json.conversationUrl ?? '')
  if (!conversationUrl) {
    throw new TavusApiError('Tavus returned no conversation URL', 502)
  }
  return {
    conversationUrl,
    conversationId:
      typeof json.conversation_id === 'string'
        ? json.conversation_id
        : typeof json.conversationId === 'string'
          ? json.conversationId
          : null,
    meetingToken:
      typeof json.meeting_token === 'string'
        ? json.meeting_token
        : typeof json.meetingToken === 'string'
          ? json.meetingToken
          : null,
  }
}
