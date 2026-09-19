import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/collection-members-plexon', () => ({
  addCollectionMemberOnPlexon: vi.fn(),
}))

vi.mock('../lib/fixtures/project-store', () => ({
  storeProjectDetail: vi.fn(),
}))

vi.mock('../lib/runtime-config', () => ({
  isPlexonAuthConfigured: () => true,
}))

vi.mock('../lib/plexon-platform-id', () => ({
  isRealPlatformProjectId: (id: string | null | undefined) =>
    Boolean(id && !String(id).startsWith('plx-local-')),
}))

import { addCollectionMemberOnPlexon } from '../lib/collection-members-plexon'
import { storeProjectDetail } from '../lib/fixtures/project-store'
import {
  mergeTeamDisplay,
  syncLocalMembersToPlexon,
} from '../lib/sync-collection-members'

describe('syncLocalMembersToPlexon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pushes each active local member additively and keeps already_member', async () => {
    vi.mocked(storeProjectDetail).mockResolvedValue({
      id: 'proj-1',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      members: [
        { id: 'm1', email: 'a@example.com', role: 'member', status: 'active' },
        { id: 'm2', email: 'b@example.com', role: 'admin', status: 'active' },
        { id: 'm3', email: 'gone@example.com', role: 'member', status: 'removed' },
      ],
    } as never)

    vi.mocked(addCollectionMemberOnPlexon)
      .mockResolvedValueOnce({
        ok: true,
        status: 'added',
        userId: 'u1',
        email: 'a@example.com',
        role: 'member',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 'already_member',
        userId: 'u2',
        email: 'b@example.com',
        role: 'admin',
      })

    const result = await syncLocalMembersToPlexon({
      projectId: 'proj-1',
      plexonUserId: 'viewer-1',
    })

    expect(result.ok).toBe(true)
    expect(addCollectionMemberOnPlexon).toHaveBeenCalledTimes(2)
    expect(result.results.map((r) => r.result)).toEqual(['migrated', 'already_member'])
  })

  it('mergeTeamDisplay keeps residual local invited emails', () => {
    const merged = mergeTeamDisplay({
      plexonMembers: [
        {
          userId: 'u1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'admin',
          source: 'creator',
        },
      ],
      localMembers: [
        { id: 'm1', email: 'owner@example.com', role: 'owner', status: 'active' },
        { id: 'm2', email: 'pending@example.com', role: 'member', status: 'invited' },
      ],
    })
    expect(merged.map((m) => m.email)).toEqual(['owner@example.com', 'pending@example.com'])
    expect(merged[1]?.source).toBe('local')
  })
})
