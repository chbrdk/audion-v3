import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../app/api/chat/tavus/session/route'
import { TavusVideoPanel } from '../components/tavus-video-panel'
import {
  resetPersonaStore,
  storeCreatePersona,
  storePatchPersona,
} from '../lib/fixtures/persona-store'
import { paths } from '../lib/paths'
import { buildTavusConversationPayload, tavusConversationsUrl } from '../lib/tavus/client'
import { tavusEmbedUrl } from '../lib/tavus/ids'

afterEach(() => {
  cleanup()
  resetPersonaStore()
  vi.unstubAllGlobals()
  delete process.env[paths.envTavusApiKey]
  delete process.env[paths.envTavusApiBase]
})

function sessionRequest(personaId?: string) {
  return new Request(`http://localhost${paths.routes.apiChatTavusSession}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personaId ? { personaId } : {}),
  })
}

describe('tavus conversation payload', () => {
  it('sends face_id and pal_id without legacy aliases', () => {
    expect(
      buildTavusConversationPayload({
        replicaId: 'r5e781e37a8d',
        palId: 'pcb7a34da5fe',
        conversationName: 'AUDION · Alex',
      }),
    ).toEqual({
      face_id: 'r5e781e37a8d',
      pal_id: 'pcb7a34da5fe',
      conversation_name: 'AUDION · Alex',
    })
  })

  it('does not send replica_id/persona_id aliases (Tavus 400s on both)', () => {
    const payload = buildTavusConversationPayload({
      replicaId: 'r0a8102ab353',
      palId: 'pdad1aea8aab',
    })
    expect(payload).not.toHaveProperty('replica_id')
    expect(payload).not.toHaveProperty('persona_id')
    expect(payload.face_id).toBe('r0a8102ab353')
    expect(payload.pal_id).toBe('pdad1aea8aab')
  })

  it('builds the conversations URL from paths, not a hardcoded host in callers', () => {
    expect(tavusConversationsUrl(paths.tavusApiDefaultBase)).toBe(
      `${paths.tavusApiDefaultBase}${paths.tavusConversationsPath}`,
    )
  })

  it('appends meeting token to the embed URL', () => {
    expect(tavusEmbedUrl('https://tavus.daily.co/room', 'tok-1')).toBe(
      'https://tavus.daily.co/room?t=tok-1',
    )
  })
})

describe('POST /api/chat/tavus/session', () => {
  it('requires personaId', async () => {
    const res = await POST(sessionRequest())
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'personaId required' })
  })

  it('returns 400 when the persona has no replica id', async () => {
    const created = await storeCreatePersona({ name: 'No Video', role: 'Tester' })
    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string; code?: string }
    expect(body.error).toMatch(/replica/i)
    expect(body.code).toBe('TAVUS_REPLICA_MISSING')
  })

  it('finds fixture personas that are missing from Postgres by id', async () => {
    const res = await POST(sessionRequest('persona-alex-morgan'))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'TAVUS_REPLICA_MISSING',
      personaId: 'persona-alex-morgan',
    })
  })

  it('returns 404 for unknown personas', async () => {
    const res = await POST(sessionRequest('persona-does-not-exist'))
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ code: 'PERSONA_NOT_FOUND' })
  })

  it('returns 503 when replica is set but TAVUS_API_KEY is missing', async () => {
    const created = await storeCreatePersona({ name: 'Keyed', role: 'Tester' })
    await storePatchPersona(created.id, { tavusReplicaId: 'r5e781e37a8d' })
    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({
      error: 'Tavus is not configured (TAVUS_API_KEY)',
    })
  })

  it('creates a live conversation and does not return a stub URL', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const created = await storeCreatePersona({ name: 'Alex Video', role: 'Lead' })
    await storePatchPersona(created.id, { tavusReplicaId: 'r5e781e37a8d' })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${paths.tavusApiDefaultBase}${paths.tavusConversationsPath}`)
      expect(init?.headers).toMatchObject({ 'x-api-key': 'test-tavus-key' })
      const body = JSON.parse(String(init?.body)) as Record<string, string>
      expect(body.face_id).toBe('r5e781e37a8d')
      expect(body).not.toHaveProperty('replica_id')
      return new Response(
        JSON.stringify({
          conversation_url: 'https://tavus.daily.co/cvi-live',
          conversation_id: 'c123',
          meeting_token: 'mtok',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      stubbed: false,
      conversationUrl: 'https://tavus.daily.co/cvi-live',
      meetingToken: 'mtok',
      conversationId: 'c123',
      personaId: created.id,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('TavusVideoPanel', () => {
  it('embeds the CVI iframe with camera and microphone permissions', () => {
    render(
      <TavusVideoPanel
        session={{ conversationUrl: 'https://tavus.daily.co/cvi-live', meetingToken: 'mtok' }}
        personaName="Alex Morgan"
      />,
    )
    const frame = screen.getByTitle('Tavus video: Alex Morgan')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe('https://tavus.daily.co/cvi-live?t=mtok')
    expect(frame.getAttribute('allow')).toContain('camera')
    expect(frame.getAttribute('allow')).toContain('microphone')
    expect(screen.getByText('Video call with Alex Morgan')).toBeInTheDocument()
  })
})
