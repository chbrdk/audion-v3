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
  properties?: {
    max_call_duration?: number
    participant_left_timeout?: number
    participant_absent_timeout?: number
  }
}

export type TavusConversationResult = {
  conversationUrl: string
  conversationId: string | null
  meetingToken: string | null
}

export type TavusListedConversation = {
  conversation_id?: string
  conversation_name?: string
  status?: string
  face_id?: string
  replica_id?: string
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

export function isTavusConcurrencyLimit(text?: string | null): boolean {
  return /maximum concurrent conversations/i.test(text ?? '')
}

export function tavusConversationName(personaName: string): string {
  return `${paths.tavusConversationNamePrefix}${personaName.trim()}`
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
    // Current Tavus API: face_id. replica_id is an alias — sending both 400s.
    payload.face_id = replicaId
  }
  if (palId) {
    // Current Tavus API: pal_id. persona_id is an alias — sending both 400s.
    payload.pal_id = palId
  }
  const name = trimTavusId(input.conversationName)
  if (name) payload.conversation_name = name
  const context = trimTavusId(input.conversationalContext)
  if (context) payload.conversational_context = context.slice(0, 1500)
  payload.properties = {
    max_call_duration: paths.tavusMaxCallDurationSec,
    participant_left_timeout: paths.tavusParticipantLeftTimeoutSec,
    participant_absent_timeout: paths.tavusParticipantAbsentTimeoutSec,
  }
  return payload
}

export function tavusConversationsUrl(base = getTavusApiBase()): string {
  return `${base.replace(/\/$/, '')}${paths.tavusConversationsPath}`
}

export function tavusConversationsListUrl(
  status: 'active' | 'ended' = 'active',
  page = 1,
  base = getTavusApiBase(),
): string {
  const params = new URLSearchParams({
    status,
    limit: String(paths.tavusConversationsListLimit),
    page: String(page),
  })
  return `${tavusConversationsUrl(base)}?${params.toString()}`
}

export function tavusConversationEndUrl(conversationId: string, base = getTavusApiBase()): string {
  return `${tavusConversationsUrl(base)}/${encodeURIComponent(conversationId.trim())}${paths.tavusConversationEndSuffix}`
}

export function selectConversationsToEnd(
  conversations: TavusListedConversation[],
  opts?: { replicaId?: string | null; all?: boolean },
): string[] {
  const prefix = paths.tavusConversationNamePrefix
  const replicaId = trimTavusId(opts?.replicaId)
  const ids: string[] = []
  for (const row of conversations) {
    const id = typeof row.conversation_id === 'string' ? row.conversation_id.trim() : ''
    if (!id) continue
    if (row.status && row.status !== 'active') continue
    if (opts?.all) {
      ids.push(id)
      continue
    }
    const name = typeof row.conversation_name === 'string' ? row.conversation_name : ''
    const face = trimTavusId(row.face_id) || trimTavusId(row.replica_id)
    if (name.startsWith(prefix) || (replicaId && face === replicaId)) ids.push(id)
  }
  return ids
}

function requireApiKey(): string {
  const apiKey = getTavusApiKey()
  if (!apiKey) {
    throw new TavusApiError('Tavus is not configured (TAVUS_API_KEY)', 503)
  }
  return apiKey
}

function tavusHeaders(apiKey: string, json = false): HeadersInit {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-api-key': apiKey,
  }
}

async function readTavusJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    return { raw: text }
  }
}

function tavusErrorDetail(json: Record<string, unknown>, fallback: string): string {
  if (typeof json.message === 'string') return json.message
  if (typeof json.error === 'string') return json.error
  return fallback.slice(0, 240)
}

function throwIfTavusFailed(response: Response, json: Record<string, unknown>, fallback: string): void {
  if (response.ok) return
  const detail = tavusErrorDetail(json, fallback)
  throw new TavusApiError(
    detail ? `${fallback} (${response.status}): ${detail.slice(0, 280)}` : `${fallback} (${response.status})`,
    response.status,
    detail,
  )
}

export async function listTavusConversations(
  status: 'active' | 'ended' = 'active',
  apiKey = requireApiKey(),
): Promise<TavusListedConversation[]> {
  const rows: TavusListedConversation[] = []
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(tavusConversationsListUrl(status, page), {
      method: 'GET',
      headers: tavusHeaders(apiKey),
      cache: 'no-store',
    })
    const json = await readTavusJson(response)
    if (!response.ok) {
      throwIfTavusFailed(response, json, 'Tavus list conversations failed')
    }
    const data = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.conversations)
        ? json.conversations
        : []
    for (const item of data) {
      if (item && typeof item === 'object') rows.push(item as TavusListedConversation)
    }
    if (data.length < paths.tavusConversationsListLimit) break
  }
  return rows
}

export async function endTavusConversation(
  conversationId: string,
  apiKey = requireApiKey(),
): Promise<void> {
  const id = conversationId.trim()
  if (!id) {
    throw new TavusApiError('conversationId required', 400)
  }
  const response = await fetch(tavusConversationEndUrl(id), {
    method: 'POST',
    headers: tavusHeaders(apiKey, true),
    cache: 'no-store',
  })
  const json = await readTavusJson(response)
  if (response.ok || response.status === 400) return
  throwIfTavusFailed(response, json, 'Tavus end conversation failed')
}

export async function endActiveTavusConversations(opts?: {
  replicaId?: string | null
  all?: boolean
  apiKey?: string
}): Promise<string[]> {
  const apiKey = opts?.apiKey ?? requireApiKey()
  let listed: TavusListedConversation[] = []
  try {
    listed = await listTavusConversations('active', apiKey)
  } catch {
    return []
  }
  const ids = selectConversationsToEnd(listed, { replicaId: opts?.replicaId, all: opts?.all })
  const ended: string[] = []
  for (const id of ids) {
    try {
      await endTavusConversation(id, apiKey)
      ended.push(id)
    } catch {
      // Best-effort: a failed end must not block creating the next room.
    }
  }
  return ended
}

async function postTavusConversation(
  payload: TavusConversationPayload,
  apiKey: string,
): Promise<TavusConversationResult> {
  const response = await fetch(tavusConversationsUrl(), {
    method: 'POST',
    headers: tavusHeaders(apiKey, true),
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const json = await readTavusJson(response)
  if (!response.ok) {
    throwIfTavusFailed(response, json, 'Tavus conversation failed')
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

export async function createTavusConversation(input: {
  replicaId?: string | null
  palId?: string | null
  conversationName?: string | null
  conversationalContext?: string | null
}): Promise<TavusConversationResult> {
  const apiKey = requireApiKey()
  const payload = buildTavusConversationPayload(input)
  if (!payload.face_id && !payload.pal_id) {
    throw new TavusApiError('Persona has no Tavus replica ID', 400)
  }

  await endActiveTavusConversations({ replicaId: payload.face_id, apiKey })
  try {
    return await postTavusConversation(payload, apiKey)
  } catch (error) {
    const text =
      error instanceof TavusApiError ? `${error.detail ?? ''} ${error.message}` : ''
    if (!isTavusConcurrencyLimit(text)) throw error
    await endActiveTavusConversations({ all: true, apiKey })
    return await postTavusConversation(payload, apiKey)
  }
}
