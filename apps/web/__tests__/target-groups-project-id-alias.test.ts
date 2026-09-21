import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/runtime-config', () => ({
  isPlexonAuthConfigured: vi.fn(() => true),
  getPlexonServiceSecret: vi.fn(() => 'test-secret'),
  getPlexonAuthUrl: vi.fn(() => 'http://localhost:3000'),
}))

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: vi.fn(async () => ({ id: 'user-1' })),
}))

vi.mock('../lib/resource-access-http', async () => {
  const actual = await vi.importActual<typeof import('../lib/resource-access-http')>(
    '../lib/resource-access-http',
  )
  return {
    ...actual,
    requireViewer: vi.fn(async () => ({ ok: true as const, viewerId: 'user-1' })),
    requireProjectAccess: vi.fn(async () => ({ ok: true as const, viewerId: 'user-1' })),
  }
})

const storeCreateTargetGroup = vi.fn(async (payload: { projectId?: string | null; name: string }) => ({
  id: 'tg-new',
  name: payload.name,
  projectId: payload.projectId ?? null,
  segment: 'Segment',
  personaCount: 0,
  status: 'draft',
  linkedPersonas: [],
  knowledgeEntries: [],
  documents: [],
  updatedAt: new Date().toISOString(),
}))

vi.mock('../lib/fixtures/target-group-store', () => ({
  storeCreateTargetGroup: (...args: unknown[]) => storeCreateTargetGroup(...(args as [never])),
  storeTargetGroupList: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 50 })),
}))

describe('POST /api/target-groups project binding', () => {
  beforeEach(() => {
    storeCreateTargetGroup.mockClear()
  })

  it('accepts snake_case project_id from Plexon EQC clients', async () => {
    const { POST } = await import('../app/api/target-groups/route')
    const res = await POST(
      new Request('http://localhost/api/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Buyers',
          segment: 'B2B',
          description: 'x',
          project_id: 'proj-bound',
        }),
      }),
    )
    expect(res.status).toBe(201)
    expect(storeCreateTargetGroup).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-bound', name: 'Buyers' }),
    )
  })

  it('still accepts camelCase projectId', async () => {
    const { POST } = await import('../app/api/target-groups/route')
    const res = await POST(
      new Request('http://localhost/api/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Buyers',
          segment: 'B2B',
          projectId: 'proj-camel',
        }),
      }),
    )
    expect(res.status).toBe(201)
    expect(storeCreateTargetGroup).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-camel' }),
    )
  })
})
