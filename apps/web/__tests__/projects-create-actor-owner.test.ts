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
  getRequestUser: vi.fn(async () => ({ id: 'user-actor' })),
}))

vi.mock('../lib/plexon-auth', () => ({
  getPlexonProfile: vi.fn(async () => ({ default_platform_company_id: 'co-1' })),
}))

vi.mock('../lib/plexon-project-origin', () => ({
  registerAudionProjectOnPlexon: vi.fn(async () => null),
}))

const storeCreateProject = vi.fn(async (_body: unknown, opts: { ownerPlexonUserId?: string | null }) => ({
  id: 'proj-new',
  name: 'SEFE',
  ownerPlexonUserId: opts.ownerPlexonUserId ?? null,
  status: 'draft',
}))

vi.mock('../lib/fixtures/project-store', () => ({
  storeCreateProject: (...args: unknown[]) => storeCreateProject(...(args as [never, never])),
  storeApplyPlatformBinding: vi.fn(),
}))

describe('POST /api/projects actor ownership', () => {
  beforeEach(() => {
    storeCreateProject.mockClear()
  })

  it('sets owner from X-Plexon-User-Id when machine token has no session', async () => {
    const { POST } = await import('../app/api/projects/route')
    const res = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'SEFE' }),
      }),
    )
    expect(res.status).toBe(201)
    expect(storeCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'SEFE' }),
      expect.objectContaining({ ownerPlexonUserId: 'user-actor' }),
    )
  })
})
