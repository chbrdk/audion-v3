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

vi.mock('../lib/fixtures/target-group-store', () => ({
  storeTargetGroupDetail: vi.fn(),
  storeTargetGroupList: vi.fn(async () => ({
    items: [
      {
        id: 'tg-mine',
        name: 'Mine',
        projectId: 'proj-mine',
        segment: 'A',
        personaCount: 0,
        knowledgeEntries: [],
        documents: [],
        linkedPersonas: [],
        status: 'active',
      },
      {
        id: 'tg-other',
        name: 'Other',
        projectId: 'proj-other',
        segment: 'B',
        personaCount: 0,
        knowledgeEntries: [],
        documents: [],
        linkedPersonas: [],
        status: 'active',
      },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
  })),
  storeCreateTargetGroup: vi.fn(),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: vi.fn(async (_p: unknown, viewerId: string | null) => viewerId === 'user-a'),
  filterProjectsForViewer: vi.fn(async (projects: Array<{ id: string }>, viewerId: string | null) =>
    viewerId === 'user-a' ? projects.filter((p) => p.id === 'proj-mine') : [],
  ),
}))

import { getRequestUser } from '../lib/auth-api-token'
import { storeProjectDetail } from '../lib/fixtures/project-store'
import { storeTargetGroupDetail } from '../lib/fixtures/target-group-store'
import { GET as listTargetGroups } from '../app/api/target-groups/route'
import { GET as getTargetGroup } from '../app/api/target-groups/[targetGroupId]/route'

describe('target-groups Access Model B (two users)', () => {
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
    vi.mocked(storeTargetGroupDetail).mockImplementation(async (id: string) => {
      if (id === 'tg-mine') {
        return {
          id: 'tg-mine',
          projectId: 'proj-mine',
          name: 'Mine',
          knowledgeEntries: [{ id: 'k1', title: 'Secret', content: 'A-only' }],
        } as never
      }
      if (id === 'tg-other') {
        return {
          id: 'tg-other',
          projectId: 'proj-other',
          name: 'Other',
          knowledgeEntries: [{ id: 'k2', title: 'Hidden', content: 'B-only' }],
        } as never
      }
      return null
    })
  })

  it('user-a lists only own project target groups', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const res = await listTargetGroups(
      new Request('http://localhost/api/target-groups?project_id=proj-mine'),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ id: string }> }
    expect(body.items.map((i) => i.id)).toEqual(['tg-mine'])
  })

  it('user-a is forbidden on other project list', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    // viewerCanAccessProject mocked to only allow user-a — but project-other returns false for user-a
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockImplementation(async (project: { id?: string }, viewerId) => {
      return viewerId === 'user-a' && project.id === 'proj-mine'
    })
    const res = await listTargetGroups(
      new Request('http://localhost/api/target-groups?project_id=proj-other'),
    )
    expect(res.status).toBe(403)
  })

  it('user-b cannot read user-a target group detail', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-b' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockResolvedValue(false)
    const res = await getTargetGroup(new Request('http://localhost/api/target-groups/tg-mine'), {
      params: Promise.resolve({ targetGroupId: 'tg-mine' }),
    })
    expect(res.status).toBe(403)
  })

  it('user-a can read own target group', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-a' })
    const { viewerCanAccessProject } = await import('../lib/project-access')
    vi.mocked(viewerCanAccessProject).mockResolvedValue(true)
    const res = await getTargetGroup(new Request('http://localhost/api/target-groups/tg-mine'), {
      params: Promise.resolve({ targetGroupId: 'tg-mine' }),
    })
    expect(res.status).toBe(200)
  })
})
