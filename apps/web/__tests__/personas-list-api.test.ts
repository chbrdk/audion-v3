import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/runtime-config', () => ({
  isPlexonAuthConfigured: vi.fn(() => true),
  getPlexonServiceSecret: vi.fn(() => ''),
  getPlexonAuthUrl: vi.fn(() => 'http://localhost:3000'),
}))

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: vi.fn(),
}))

vi.mock('../lib/fixtures/project-store', () => ({
  storeProjectDetail: vi.fn(),
}))

vi.mock('../lib/fixtures/persona-store', () => ({
  storePersonaList: vi.fn(),
  storeCreatePersona: vi.fn(),
}))

vi.mock('../lib/fixtures/persona-prompts-store', () => ({
  storeSeedDefaultNaturalVoice: vi.fn(async () => undefined),
}))

vi.mock('../lib/tavus/sync', () => ({
  syncPersonaTavusPal: vi.fn(async (persona: unknown) => ({ persona, synced: false })),
}))

vi.mock('../lib/bey/sync', () => ({
  syncPersonaBeyAgent: vi.fn(async (persona: unknown) => ({ persona, synced: false })),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: vi.fn(async (_p: unknown, viewerId: string | null) => viewerId === 'user-a'),
  filterPersonasForViewer: vi.fn(async (personas: Array<{ id: string; projectId?: string | null }>, viewerId) =>
    viewerId === 'user-a' ? personas.filter((p) => p.projectId === 'proj-mine') : [],
  ),
}))

import { getRequestUser } from '../lib/auth-api-token'
import { storeProjectDetail } from '../lib/fixtures/project-store'
import { storePersonaList, storeCreatePersona } from '../lib/fixtures/persona-store'
import { GET as listPersonas, POST as createPersona } from '../app/api/personas/route'

describe('GET /api/personas list + name search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storeProjectDetail).mockResolvedValue({
      id: 'proj-mine',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      ownerPlexonUserId: 'user-a',
      name: 'Mine',
    } as never)
    vi.mocked(storePersonaList).mockResolvedValue({
      items: [
        {
          id: 'per-markus',
          slug: 'markus-reinhardt',
          name: 'Markus Reinhardt',
          role: 'Entscheider',
          status: 'ready',
          avatarUrl: null,
          projectId: 'proj-mine',
        },
        {
          id: 'per-other',
          slug: 'other',
          name: 'Other Persona',
          role: 'Buyer',
          status: 'ready',
          avatarUrl: null,
          projectId: 'proj-other',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
    } as never)
  })

  it('lists only Access Model B visible personas', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' } as never)
    const res = await listPersonas(new Request('http://localhost/api/personas'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ id: string }> }
    expect(body.items.map((p) => p.id)).toEqual(['per-markus'])
  })

  it('finds Markus via fuzzy q=Markus Reinhard', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' } as never)
    const res = await listPersonas(
      new Request('http://localhost/api/personas?q=Markus%20Reinhard'),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ id: string; name: string }>; total: number }
    expect(body.total).toBe(1)
    expect(body.items[0]?.name).toBe('Markus Reinhardt')
  })

  it('rejects unauthenticated machine list', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null)
    const res = await listPersonas(new Request('http://localhost/api/personas'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/personas project_id alias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storeProjectDetail).mockResolvedValue({
      id: 'proj-mine',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      ownerPlexonUserId: 'user-a',
      name: 'Mine',
    } as never)
    vi.mocked(storeCreatePersona).mockImplementation(async (payload) => ({
      id: 'per-new',
      slug: 'new',
      name: payload.name,
      role: payload.role || 'Persona',
      status: 'draft',
      avatarUrl: null,
      projectId: payload.projectId ?? null,
    }) as never)
  })

  it('accepts MCP-style project_id (snake_case)', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' } as never)
    const res = await createPersona(
      new Request('http://localhost/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Julia Wendt (Kopie)', project_id: 'proj-mine' }),
      }),
    )
    expect(res.status).toBe(201)
    expect(storeCreatePersona).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Julia Wendt (Kopie)', projectId: 'proj-mine' }),
    )
  })

  it('rejects create without projectId/project_id when auth is on', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' } as never)
    const res = await createPersona(
      new Request('http://localhost/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'No Project' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toMatch(/projectId/i)
  })
})
