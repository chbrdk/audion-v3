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
  storePersonaDetail: vi.fn(),
  storePatchPersona: vi.fn(),
  storeDeletePersona: vi.fn(),
  storeCreatePersona: vi.fn(),
}))

vi.mock('../lib/tavus/sync', () => ({
  syncPersonaTavusPal: vi.fn(async (persona: unknown) => ({ persona, synced: false })),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: vi.fn(async (_p: unknown, viewerId: string | null) => viewerId === 'user-a'),
  filterPersonasForViewer: vi.fn(async (personas: Array<{ id: string; projectId?: string | null }>, viewerId) =>
    viewerId === 'user-a' ? personas.filter((p) => p.projectId === 'proj-mine') : [],
  ),
}))

import { getRequestUser } from '../lib/auth-api-token'
import { storeProjectDetail } from '../lib/fixtures/project-store'
import { storePersonaDetail, storePatchPersona } from '../lib/fixtures/persona-store'
import { GET as getPersona, PATCH as patchPersona } from '../app/api/personas/[personaId]/route'
import { GET as getPersonaKnowledge } from '../app/api/personas/[personaId]/knowledge/route'

describe('personas Access Model B (two users)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storeProjectDetail).mockImplementation(async (id: string) => {
      if (id === 'proj-mine') {
        return {
          id: 'proj-mine',
          platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          ownerPlexonUserId: 'user-a',
          name: 'Mine',
        } as never
      }
      if (id === 'proj-other') {
        return {
          id: 'proj-other',
          platformProjectId: '11111111-2222-4333-8444-555555555555',
          ownerPlexonUserId: 'user-b',
          name: 'Other',
        } as never
      }
      return null
    })
    vi.mocked(storePersonaDetail).mockImplementation(async (id: string) => {
      if (id === 'per-mine') {
        return {
          id: 'per-mine',
          projectId: 'proj-mine',
          name: 'Mine Persona',
          role: 'Buyer',
          knowledgeEntries: [{ id: 'k1', title: 'Secret', content: 'A-only' }],
        } as never
      }
      if (id === 'per-other') {
        return {
          id: 'per-other',
          projectId: 'proj-other',
          name: 'Other Persona',
          role: 'Buyer',
          knowledgeEntries: [{ id: 'k2', title: 'Hidden', content: 'B-only' }],
        } as never
      }
      return null
    })
  })

  it('user-a can GET own persona detail', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const res = await getPersona(new Request('http://localhost/api/personas/per-mine'), {
      params: Promise.resolve({ personaId: 'per-mine' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string }
    expect(body.id).toBe('per-mine')
  })

  it('user-a is forbidden on foreign persona detail', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockImplementation(async (project: { id?: string }, viewerId) => {
      return viewerId === 'user-a' && project.id === 'proj-mine'
    })
    const res = await getPersona(new Request('http://localhost/api/personas/per-other'), {
      params: Promise.resolve({ personaId: 'per-other' }),
    })
    expect(res.status).toBe(403)
  })

  it('unauthenticated request is 401 when auth configured', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null)
    const res = await getPersona(new Request('http://localhost/api/personas/per-mine'), {
      params: Promise.resolve({ personaId: 'per-mine' }),
    })
    expect(res.status).toBe(401)
  })

  it('foreign knowledge GET is forbidden', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockResolvedValue(false)
    const res = await getPersonaKnowledge(new Request('http://localhost/api/personas/per-other/knowledge'), {
      params: Promise.resolve({ personaId: 'per-other' }),
    })
    expect(res.status).toBe(403)
  })

  it('PATCH requires access', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockResolvedValue(true)
    vi.mocked(storePatchPersona).mockResolvedValue({
      id: 'per-mine',
      projectId: 'proj-mine',
      name: 'Updated',
      role: 'Buyer',
      knowledgeEntries: [],
    } as never)
    const res = await patchPersona(
      new Request('http://localhost/api/personas/per-mine', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }),
      { params: Promise.resolve({ personaId: 'per-mine' }) },
    )
    expect(res.status).toBe(200)
  })
})
