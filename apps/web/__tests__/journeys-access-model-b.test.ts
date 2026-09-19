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

vi.mock('../lib/fixtures/journey-store', () => ({
  storeJourneyDetail: vi.fn(),
  storePatchJourney: vi.fn(),
  storeDeleteJourney: vi.fn(),
  storeCreateJourney: vi.fn(),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: vi.fn(async (_p: unknown, viewerId: string | null) => viewerId === 'user-a'),
  filterByParentProjectForViewer: vi.fn(async (items: Array<{ id: string; projectId?: string | null }>, viewerId) =>
    viewerId === 'user-a' ? items.filter((j) => j.projectId === 'proj-mine') : [],
  ),
}))

import { getRequestUser } from '../lib/auth-api-token'
import { storeProjectDetail } from '../lib/fixtures/project-store'
import { storeJourneyDetail } from '../lib/fixtures/journey-store'
import { GET as getJourney, PATCH as patchJourney } from '../app/api/journeys/[journeyId]/route'

describe('journeys Access Model B (two users)', () => {
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
    vi.mocked(storeJourneyDetail).mockImplementation(async (id: string) => {
      if (id === 'j-mine') {
        return {
          id: 'j-mine',
          projectId: 'proj-mine',
          name: 'Mine Journey',
          journeyType: 'journey',
          status: 'draft',
          phases: [],
        } as never
      }
      if (id === 'j-other') {
        return {
          id: 'j-other',
          projectId: 'proj-other',
          name: 'Other Journey',
          journeyType: 'journey',
          status: 'draft',
          phases: [],
        } as never
      }
      return null
    })
  })

  it('user-a can GET own journey', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const res = await getJourney(new Request('http://localhost/api/journeys/j-mine'), {
      params: Promise.resolve({ journeyId: 'j-mine' }),
    })
    expect(res.status).toBe(200)
  })

  it('user-a is forbidden on foreign journey', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockImplementation(async (project: { id?: string }, viewerId) => {
      return viewerId === 'user-a' && project.id === 'proj-mine'
    })
    const res = await getJourney(new Request('http://localhost/api/journeys/j-other'), {
      params: Promise.resolve({ journeyId: 'j-other' }),
    })
    expect(res.status).toBe(403)
  })

  it('unauthenticated is 401', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null)
    const res = await getJourney(new Request('http://localhost/api/journeys/j-mine'), {
      params: Promise.resolve({ journeyId: 'j-mine' }),
    })
    expect(res.status).toBe(401)
  })

  it('PATCH requires access', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockResolvedValue(true)
    const { storePatchJourney } = await import('../lib/fixtures/journey-store')
    vi.mocked(storePatchJourney).mockResolvedValue({
      id: 'j-mine',
      projectId: 'proj-mine',
      name: 'Updated',
      journeyType: 'journey',
      status: 'draft',
      phases: [],
    } as never)
    const res = await patchJourney(
      new Request('http://localhost/api/journeys/j-mine', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }),
      { params: Promise.resolve({ journeyId: 'j-mine' }) },
    )
    expect(res.status).toBe(200)
  })
})
