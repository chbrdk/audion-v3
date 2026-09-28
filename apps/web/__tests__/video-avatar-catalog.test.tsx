import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { GET as getTavusFaces } from '../app/api/integrations/tavus/faces/route'
import { GET as getBeyAvatars } from '../app/api/integrations/bey/avatars/route'
import { PersonaEditableBey } from '../components/persona-editable-bey'
import { PersonaEditableTavus } from '../components/persona-editable-tavus'
import { VideoAvatarPicker } from '../components/video-avatar-picker'
import {
  normalizeBeyAvatarRow,
  listBeyAvatars,
} from '../lib/bey/client'
import { paths } from '../lib/paths'
import {
  listTavusFaces,
  normalizeTavusFaceRow,
  tavusFacesUrl,
} from '../lib/tavus/client'
import { UserPrefsProvider } from '../lib/user-prefs'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('../auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'viewer-1' } })),
}))

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: vi.fn(async () => ({ id: 'viewer-1' })),
}))

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', '')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  delete process.env[paths.envTavusApiKey]
  delete process.env[paths.envTavusApiBase]
  delete process.env[paths.envBeyApiKey]
  delete process.env[paths.envBeyApiBase]
})

function renderWithPrefs(ui: ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('video avatar catalog normalizers', () => {
  it('normalizes Tavus face rows from face_id / replica_id', () => {
    expect(
      normalizeTavusFaceRow({
        face_id: 'r111',
        face_name: 'Ada',
        thumbnail_image_url: 'https://cdn.example/ada.jpg',
        status: 'ready',
      }),
    ).toEqual({
      id: 'r111',
      name: 'Ada',
      previewUrl: 'https://cdn.example/ada.jpg',
      status: 'ready',
    })
    expect(normalizeTavusFaceRow({ replica_id: 'r222', replica_name: 'Bea' })?.id).toBe('r222')
    expect(normalizeTavusFaceRow({ name: 'No id' })).toBeNull()
  })

  it('normalizes Bey avatar rows', () => {
    expect(
      normalizeBeyAvatarRow({
        id: '01234567-89ab-4def-8123-456789abcdef',
        name: 'Studio One',
        thumbnail_url: 'https://cdn.example/one.jpg',
        status: 'ready',
      }),
    ).toEqual({
      id: '01234567-89ab-4def-8123-456789abcdef',
      name: 'Studio One',
      previewUrl: 'https://cdn.example/one.jpg',
      status: 'ready',
    })
    expect(normalizeBeyAvatarRow({ avatar_id: 'av-9', display_name: 'Nine' })?.name).toBe('Nine')
    expect(normalizeBeyAvatarRow({ name: 'No id' })).toBeNull()
  })

  it('lists Tavus faces across pages', async () => {
    process.env[paths.envTavusApiKey] = 'tv-test'
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      expect(url).toContain(paths.tavusFacesPath)
      if (url.includes('page=1')) {
        return jsonResponse({
          data: [{ face_id: 'r1', face_name: 'One', thumbnail_image_url: 'https://x/1.jpg' }],
        })
      }
      return jsonResponse({ data: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const items = await listTavusFaces()
    expect(items).toEqual([{ id: 'r1', name: 'One', previewUrl: 'https://x/1.jpg', status: null }])
    expect(tavusFacesUrl(1)).toContain(`limit=${paths.tavusFacesListLimit}`)
  })

  it('lists Bey avatars', async () => {
    process.env[paths.envBeyApiKey] = 'bey-test'
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        data: [{ id: 'av-1', name: 'Alpha', image_url: 'https://x/a.jpg' }],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const items = await listBeyAvatars()
    expect(items).toEqual([{ id: 'av-1', name: 'Alpha', previewUrl: 'https://x/a.jpg', status: null }])
  })
})

describe('video avatar catalog BFF routes', () => {
  it('returns 503 when Tavus key is missing', async () => {
    const response = await getTavusFaces(
      new Request(`http://localhost${paths.routes.apiIntegrationsTavusFaces}`),
    )
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe('TAVUS_API_KEY_MISSING')
    expect(body.configured).toBe(false)
    expect(body.items).toEqual([])
  })

  it('returns Tavus face catalog when configured', async () => {
    process.env[paths.envTavusApiKey] = 'tv-test'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          data: [{ face_id: 'r9', face_name: 'Nine', preview_url: 'https://x/9.jpg' }],
        }),
      ),
    )
    const response = await getTavusFaces(
      new Request(`http://localhost${paths.routes.apiIntegrationsTavusFaces}`),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.configured).toBe(true)
    expect(body.items).toEqual([
      { id: 'r9', name: 'Nine', previewUrl: 'https://x/9.jpg', status: null },
    ])
  })

  it('returns 503 when Bey key is missing', async () => {
    const response = await getBeyAvatars(
      new Request(`http://localhost${paths.routes.apiIntegrationsBeyAvatars}`),
    )
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe('BEY_API_KEY_MISSING')
  })

  it('returns Bey avatar catalog when configured', async () => {
    process.env[paths.envBeyApiKey] = 'bey-test'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          data: [{ id: 'av-2', name: 'Beta', thumbnail_url: 'https://x/b.jpg' }],
        }),
      ),
    )
    const response = await getBeyAvatars(
      new Request(`http://localhost${paths.routes.apiIntegrationsBeyAvatars}`),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.items[0]).toMatchObject({ id: 'av-2', name: 'Beta' })
  })
})

describe('VideoAvatarPicker + magazine bands', () => {
  it('renders catalog items and calls onSelect', async () => {
    const onSelect = vi.fn()
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        configured: true,
        items: [
          { id: 'r1', name: 'Face One', previewUrl: 'https://cdn.example/1.jpg' },
          { id: 'r2', name: 'Face Two', previewUrl: null },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderWithPrefs(
      <VideoAvatarPicker
        catalogUrl={paths.routes.apiIntegrationsTavusFaces}
        selectedId={null}
        onSelect={onSelect}
        ariaLabel="Faces"
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Face One')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Face One/i }))
    expect(onSelect).toHaveBeenCalledWith('r1')
  })

  it('patches tavusReplicaId when a Face is picked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes(paths.routes.apiIntegrationsTavusFaces)) {
        return jsonResponse({
          configured: true,
          items: [{ id: 'r5e781e37a8d', name: 'Stock Face', previewUrl: null }],
        })
      }
      if (url.includes('/api/personas/') && init?.method === 'PATCH') {
        return jsonResponse({ ok: true })
      }
      return jsonResponse({ error: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderWithPrefs(
      <PersonaEditableTavus
        personaId="p1"
        tavusReplicaId={null}
        tavusPersonaId={null}
        tavusLanguage="en"
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Stock Face')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Stock Face/i }))
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes('/api/personas/p1') && init?.method === 'PATCH',
      )
      expect(patchCall).toBeTruthy()
      const body = JSON.parse(String(patchCall?.[1]?.body)) as { tavusReplicaId?: string }
      expect(body.tavusReplicaId).toBe('r5e781e37a8d')
    })
  })

  it('patches beyAvatarId when an avatar is picked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes(paths.routes.apiIntegrationsBeyAvatars)) {
        return jsonResponse({
          configured: true,
          items: [{ id: 'av-77', name: 'Beyond One', previewUrl: null }],
        })
      }
      if (url.includes('/api/personas/') && init?.method === 'PATCH') {
        return jsonResponse({ ok: true })
      }
      return jsonResponse({ error: 'unexpected' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderWithPrefs(
      <PersonaEditableBey
        personaId="p1"
        beyAvatarId={null}
        beyAgentId={null}
        videoCallProvider={null}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Beyond One')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Beyond One/i }))
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes('/api/personas/p1') && init?.method === 'PATCH',
      )
      expect(patchCall).toBeTruthy()
      const body = JSON.parse(String(patchCall?.[1]?.body)) as { beyAvatarId?: string }
      expect(body.beyAvatarId).toBe('av-77')
    })
  })
})
