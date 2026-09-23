import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, POST } from '../app/api/chat/video/session/route'
import { VideoCallPanel } from '../components/video-call-panel'
import {
  resetPersonaStore,
  storeCreatePersona,
  storePatchPersona,
  storePersonaDetail,
} from '../lib/fixtures/persona-store'
import { paths } from '../lib/paths'
import { beyAgentPayload } from '../lib/bey/client'
import { beyChatEmbedUrl } from '../lib/bey/ids'
import { resolveVideoCallProvider } from '../lib/video-call/resolve-provider'
import { normalizePersonaDetail } from '../lib/personas'

beforeEach(() => {
  // Deploy/CI may inject DATABASE_URL; assert the in-memory persona store path.
  vi.stubEnv('DATABASE_URL', '')
  resetPersonaStore()
})

afterEach(() => {
  cleanup()
  resetPersonaStore()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  delete process.env[paths.envTavusApiKey]
  delete process.env[paths.envTavusApiBase]
  delete process.env[paths.envBeyApiKey]
  delete process.env[paths.envBeyApiBase]
  delete process.env[paths.envVideoCallProviderDefault]
})

function sessionRequest(personaId?: string) {
  return new Request(`http://localhost${paths.routes.apiChatVideoSession}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personaId ? { personaId } : {}),
  })
}

function endRequest(conversationId?: string, provider?: 'tavus' | 'bey') {
  return new Request(`http://localhost${paths.routes.apiChatVideoSession}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(conversationId ? { conversationId } : {}),
      ...(provider ? { provider } : {}),
    }),
  })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('bey agent payload', () => {
  it('maps magazine fields to BEY agent body', () => {
    expect(
      beyAgentPayload({
        name: 'AUDION · Alex',
        avatarId: '01234567-89ab-4def-8123-456789abcdef',
        systemPrompt: 'You are Alex.',
        language: 'de',
      }),
    ).toEqual({
      name: 'AUDION · Alex',
      avatar_id: '01234567-89ab-4def-8123-456789abcdef',
      system_prompt: 'You are Alex.',
      language: 'de',
      max_session_length_minutes: paths.beyMaxSessionLengthMinutes,
    })
  })

  it('builds bey.chat embed URL', () => {
    expect(beyChatEmbedUrl('agent-1')).toBe(`${paths.beyChatEmbedBase}/agent-1`)
  })
})

describe('resolveVideoCallProvider', () => {
  it('returns VIDEO_PROVIDER_UNCONFIGURED when neither provider is ready', () => {
    const persona = normalizePersonaDetail({
      id: 'p1',
      name: 'A',
      role: 'R',
    })!
    const result = resolveVideoCallProvider(persona)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VIDEO_PROVIDER_UNCONFIGURED')
      expect(result.status).toBe(400)
    }
  })

  it('prefers explicit bey when avatar + key present', () => {
    process.env[paths.envBeyApiKey] = 'bey-test-key'
    const persona = normalizePersonaDetail({
      id: 'p1',
      name: 'A',
      role: 'R',
      videoCallProvider: 'bey',
      beyAvatarId: '01234567-89ab-4def-8123-456789abcdef',
    })!
    const result = resolveVideoCallProvider(persona)
    expect(result).toEqual({ ok: true, provider: 'bey' })
  })

  it('uses AUDION_VIDEO_CALL_PROVIDER as tie-break when both ready', () => {
    process.env[paths.envBeyApiKey] = 'bey-test-key'
    process.env[paths.envTavusApiKey] = 'tavus-test-key'
    process.env[paths.envVideoCallProviderDefault] = 'bey'
    const persona = normalizePersonaDetail({
      id: 'p1',
      name: 'A',
      role: 'R',
      tavusReplicaId: 'r5e781e37a8d',
      beyAvatarId: '01234567-89ab-4def-8123-456789abcdef',
    })!
    expect(resolveVideoCallProvider(persona)).toEqual({ ok: true, provider: 'bey' })
  })
})

describe('POST /api/chat/video/session', () => {
  it('400 when personaId missing', async () => {
    const res = await POST(sessionRequest())
    expect(res.status).toBe(400)
  })

  it('404 when persona missing', async () => {
    const res = await POST(sessionRequest('missing-persona'))
    expect(res.status).toBe(404)
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('PERSONA_NOT_FOUND')
  })

  it('400 VIDEO_PROVIDER_UNCONFIGURED without ids', async () => {
    const created = await storeCreatePersona({ name: 'No Video', role: 'X' })
    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('VIDEO_PROVIDER_UNCONFIGURED')
  })

  it('503 BEY_API_KEY_MISSING when bey ids set without key', async () => {
    const created = await storeCreatePersona({ name: 'Bey Face', role: 'X' })
    await storePatchPersona(created.id, {
      beyAvatarId: '01234567-89ab-4def-8123-456789abcdef',
      videoCallProvider: 'bey',
    })
    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('BEY_API_KEY_MISSING')
  })

  it('creates LiveKit session after agent sync', async () => {
    process.env[paths.envBeyApiKey] = 'bey-test-key'
    const created = await storeCreatePersona({ name: 'Bey Live', role: 'X' })
    await storePatchPersona(created.id, {
      beyAvatarId: '01234567-89ab-4def-8123-456789abcdef',
      videoCallProvider: 'bey',
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      if (url.includes(paths.beyAgentsPath) && method === 'POST') {
        return jsonResponse({ id: 'agent-synced-1' })
      }
      if (url.includes(paths.beyLivekitRoomsPath) && method === 'POST') {
        return jsonResponse({
          id: 'room-1',
          livekit_url: 'wss://livekit.example/room',
          livekit_token: 'lk-token',
        })
      }
      return jsonResponse({ error: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      provider: string
      conversationId: string
      media: { kind: string; url: string; token: string }
    }
    expect(body.provider).toBe('bey')
    expect(body.conversationId).toBe('room-1')
    expect(body.media).toEqual({
      kind: 'livekit',
      url: 'wss://livekit.example/room',
      token: 'lk-token',
    })
    const detail = await storePersonaDetail(created.id)
    expect(detail?.beyAgentId).toBe('agent-synced-1')
  })

  it('falls back to bey.chat iframe on LiveKit plan 403', async () => {
    process.env[paths.envBeyApiKey] = 'bey-test-key'
    const created = await storeCreatePersona({ name: 'Bey Iframe', role: 'X' })
    await storePatchPersona(created.id, {
      beyAvatarId: '01234567-89ab-4def-8123-456789abcdef',
      beyAgentId: 'agent-ready',
      videoCallProvider: 'bey',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = (init?.method || 'GET').toUpperCase()
        if (url.includes(paths.beyAgentsPath) && method === 'PATCH') {
          return jsonResponse({ id: 'agent-ready' })
        }
        if (url.includes(paths.beyLivekitRoomsPath)) {
          return jsonResponse({ detail: 'plan' }, 403)
        }
        return jsonResponse({ error: 'unexpected' }, 500)
      }),
    )

    const res = await POST(sessionRequest(created.id))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { media: { kind: string; url: string } }
    expect(body.media).toEqual({
      kind: 'iframe',
      url: beyChatEmbedUrl('agent-ready'),
    })
  })
})

describe('DELETE /api/chat/video/session', () => {
  it('acks bey end without upstream call', async () => {
    const res = await DELETE(endRequest('room-1', 'bey'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, conversationId: 'room-1' })
  })
})

describe('VideoCallPanel', () => {
  it('renders iframe media', () => {
    render(
      <VideoCallPanel
        session={{
          provider: 'bey',
          conversationId: null,
          media: { kind: 'iframe', url: 'https://bey.chat/agent-1' },
        }}
        personaName="Alex"
      />,
    )
    const frame = screen.getByTitle('Video call with Alex')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe('https://bey.chat/agent-1')
  })

  it('renders empty state without media url', () => {
    render(
      <VideoCallPanel
        session={{
          provider: 'tavus',
          conversationId: null,
          media: { kind: 'iframe', url: '' },
        }}
      />,
    )
    expect(document.querySelector('.audion-tavus-video-panel--empty')).toBeTruthy()
  })
})
