import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'viewer-1' } })),
}))

vi.mock('../lib/fixtures/project-store', () => ({
  storeProjectDetail: vi.fn(),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: vi.fn(async () => true),
}))

vi.mock('../lib/plexon-platform-id', () => ({
  isRealPlatformProjectId: (id: string | null | undefined) => {
    const trimmed = id?.trim()
    if (!trimmed) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  },
}))

vi.mock('../lib/collection-members-plexon', () => ({
  createCollectionInviteOnPlexon: vi.fn(),
}))

import { storeProjectDetail } from '../lib/fixtures/project-store'
import { createCollectionInviteOnPlexon } from '../lib/collection-members-plexon'

describe('project invites BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storeProjectDetail).mockResolvedValue({
      id: 'proj-1',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      name: 'Demo',
    } as never)
  })

  it('forwards toEmail to Plexon', async () => {
    vi.mocked(createCollectionInviteOnPlexon).mockResolvedValue({
      ok: true,
      inviteUrl: 'https://plexon.test/invite/tok',
      inviteId: 'inv-1',
      emailedTo: 'peer@example.com',
    })
    const { POST } = await import('../app/api/projects/[projectId]/invites/route')
    const res = await POST(
      new Request('http://localhost/api/projects/proj-1/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'member', toEmail: 'peer@example.com' }),
      }),
      { params: Promise.resolve({ projectId: 'proj-1' }) },
    )
    expect(res.status).toBe(200)
    expect(createCollectionInviteOnPlexon).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'peer@example.com' }),
    )
    expect((await res.json()).emailedTo).toBe('peer@example.com')
  })
})
