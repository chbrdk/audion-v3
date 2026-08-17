import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DELETE, POST } from '../app/api/chat/tavus/session/route'
import { TavusVideoPanel } from '../components/tavus-video-panel'
import {
  resetPersonaStore,
  storeCreatePersona,
  storePatchPersona,
} from '../lib/fixtures/persona-store'
import { paths } from '../lib/paths'
import {
  buildTavusConversationPayload,
  isTavusConcurrencyLimit,
  selectConversationsToEnd,
  tavusConversationEndUrl,
  tavusConversationName,
  tavusConversationsListUrl,
  tavusConversationsUrl,
} from '../lib/tavus/client'
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

function endRequest(conversationId?: string) {
  return new Request(`http://localhost${paths.routes.apiChatTavusSession}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conversationId ? { conversationId } : {}),
  })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('tavus conversation payload', () => {
  it('sends face_id and pal_id without legacy aliases, plus idle timeouts', () => {
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
      properties: {
        max_call_duration: paths.tavusMaxCallDurationSec,
        participant_left_timeout: paths.tavusParticipantLeftTimeoutSec,
        participant_absent_timeout: paths.tavusParticipantAbsentTimeoutSec,
      },
    })
  })

  it('sends Tavus full language names, not de/en codes', () => {
    expect(
      buildTavusConversationPayload({
        replicaId: 'r5e781e37a8d',
        language: paths.tavusLanguageNames.de,
      }).properties?.language,
    ).toBe('German')
    expect(
      buildTavusConversationPayload({
        replicaId: 'r5e781e37a8d',
        language: paths.tavusLanguageNames.en,
      }).properties?.language,
    ).toBe('English')
    expect(
      buildTavusConversationPayload({ replicaId: 'r5e781e37a8d' }).properties,
    ).not.toHaveProperty('language')
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

  it('builds conversation URLs from paths, not a hardcoded host in callers', () => {
    expect(tavusConversationsUrl(paths.tavusApiDefaultBase)).toBe(
      `${paths.tavusApiDefaultBase}${paths.tavusConversationsPath}`,
    )
    expect(tavusConversationEndUrl('c-old', paths.tavusApiDefaultBase)).toBe(
      `${paths.tavusApiDefaultBase}${paths.tavusConversationsPath}/c-old${paths.tavusConversationEndSuffix}`,
    )
    expect(tavusConversationsListUrl('active', 1, paths.tavusApiDefaultBase)).toContain('status=active')
    expect(tavusConversationName('Sabine Koller')).toBe(`${paths.tavusConversationNamePrefix}Sabine Koller`)
    expect(paths.tavusPalsPath).toBe('/v2/pals')
    expect(paths.tavusPalPatchTarget).toBe('live')
  })

  it('selects AUDION-named or same-face active rooms to end', () => {
    expect(
      selectConversationsToEnd(
        [
          {
            conversation_id: 'c-audion',
            conversation_name: 'AUDION · Sabine Koller',
            status: 'active',
          },
          { conversation_id: 'c-other', conversation_name: 'BSH', status: 'active' },
          { conversation_id: 'c-ended', conversation_name: 'AUDION · Old', status: 'ended' },
          { conversation_id: 'c-face', face_id: 'r0a8102ab353', status: 'active' },
        ],
        { replicaId: 'r0a8102ab353' },
      ),
    ).toEqual(['c-audion', 'c-face'])
  })

  it('detects the Tavus concurrent-conversation 400', () => {
    expect(isTavusConcurrencyLimit('User has reached maximum concurrent conversations')).toBe(true)
    expect(isTavusConcurrencyLimit('Cannot have both persona_id and pal_id')).toBe(false)
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

  it('ends leftover active rooms then creates a live conversation', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const created = await storeCreatePersona({ name: 'Alex Video', role: 'Lead' })
    await storePatchPersona(created.id, { tavusReplicaId: 'r5e781e37a8d' })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      expect(init?.headers).toMatchObject({ 'x-api-key': 'test-tavus-key' })
      if (url.includes(paths.tavusPalsPath)) {
        expect(method).toBe('POST')
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        expect(body.default_face_id).toBe('r5e781e37a8d')
        expect(String(body.system_prompt)).toContain('Alex Video')
        return jsonResponse({ pal_id: 'p-synced' })
      }
      if (method === 'GET') {
        expect(url).toContain('status=active')
        return jsonResponse({
          data: [
            {
              conversation_id: 'c-old',
              conversation_name: 'AUDION · Alex Video',
              status: 'active',
              face_id: 'r5e781e37a8d',
            },
          ],
        })
      }
      if (url.endsWith(`/c-old${paths.tavusConversationEndSuffix}`)) {
        return jsonResponse({})
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.face_id).toBe('r5e781e37a8d')
      expect(body.pal_id).toBe('p-synced')
      expect(body).not.toHaveProperty('replica_id')
      expect(body.properties).toMatchObject({
        participant_absent_timeout: paths.tavusParticipantAbsentTimeoutSec,
        language: 'English',
      })
      return jsonResponse({
        conversation_url: 'https://tavus.daily.co/cvi-live',
        conversation_id: 'c123',
        meeting_token: 'mtok',
      })
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
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((url) => url.includes('status=active'))).toBe(true)
    expect(urls.some((url) => url.endsWith(`/c-old${paths.tavusConversationEndSuffix}`))).toBe(true)
  })

  it('sends German as Tavus properties.language when the persona language is de', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const created = await storeCreatePersona({ name: 'Sabine Koller', role: 'Einkäuferin' })
    await storePatchPersona(created.id, { tavusReplicaId: 'r0a8102ab353', tavusLanguage: 'de' })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      if (url.includes(paths.tavusPalsPath)) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        expect(String(body.system_prompt)).toContain('Speak German')
        return jsonResponse({ pal_id: 'p-de' })
      }
      if (method === 'GET') return jsonResponse({ data: [] })
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.properties).toMatchObject({ language: 'German' })
      expect(String(body.conversational_context)).toContain('German')
      return jsonResponse({
        conversation_url: 'https://tavus.daily.co/cvi-de',
        conversation_id: 'c-de',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(200)
  })

  it('retries create after ending all active rooms on a concurrent-limit 400', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const created = await storeCreatePersona({ name: 'Sabine', role: 'Lead' })
    await storePatchPersona(created.id, { tavusReplicaId: 'r0a8102ab353' })

    let createAttempts = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      if (url.includes(paths.tavusPalsPath)) {
        return jsonResponse({ pal_id: 'p-sabine' })
      }
      if (method === 'GET') {
        return jsonResponse({
          data:
            createAttempts === 0
              ? []
              : [{ conversation_id: 'c-hidden', conversation_name: 'Other', status: 'active' }],
        })
      }
      if (url.endsWith(`/c-hidden${paths.tavusConversationEndSuffix}`)) {
        return jsonResponse({})
      }
      createAttempts += 1
      if (createAttempts === 1) {
        return jsonResponse({ message: 'User has reached maximum concurrent conversations' }, 400)
      }
      return jsonResponse({
        conversation_url: 'https://tavus.daily.co/cvi-retry',
        conversation_id: 'c-new',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      conversationUrl: 'https://tavus.daily.co/cvi-retry',
      conversationId: 'c-new',
    })
    expect(createAttempts).toBe(2)
  })
})

describe('DELETE /api/chat/tavus/session', () => {
  it('requires conversationId', async () => {
    const res = await DELETE(endRequest())
    expect(res.status).toBe(400)
  })

  it('ends the Tavus conversation', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(
        `${paths.tavusApiDefaultBase}${paths.tavusConversationsPath}/c-end${paths.tavusConversationEndSuffix}`,
      )
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await DELETE(endRequest('c-end'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, conversationId: 'c-end' })
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

  it('ends the conversation when the panel unmounts', () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const { unmount } = render(
      <TavusVideoPanel
        session={{
          conversationUrl: 'https://tavus.daily.co/cvi-live',
          conversationId: 'c-end',
          meetingToken: 'mtok',
        }}
        personaName="Sabine Koller"
      />,
    )
    unmount()
    expect(fetchMock).toHaveBeenCalledWith(
      paths.routes.apiChatTavusSession,
      expect.objectContaining({
        method: 'DELETE',
        keepalive: true,
        body: JSON.stringify({ conversationId: 'c-end' }),
      }),
    )
  })
})
