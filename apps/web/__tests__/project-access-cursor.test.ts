import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/runtime-config', () => ({
  getPlexonAuthUrl: vi.fn(() => 'http://plexon.test'),
  getPlexonServiceSecret: vi.fn(() => 'secret'),
  isPlexonAuthConfigured: vi.fn(() => true),
}))

vi.mock('../lib/plexon-contract', () => ({
  getPlexonContractHeaders: () => ({ 'X-Service-Secret': 'secret' }),
}))

vi.mock('../lib/paths', () => ({
  paths: { plexonAccessibleCollectionsPath: '/api/platform/provisioning/accessible-collections' },
}))

describe('audion fetchAccessiblePlatformProjectIds cursor paging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('pages through nextCursor until exhausted', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'pp-1' }],
          nextCursor: 'c2',
          truncated: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'pp-2' }],
          nextCursor: null,
          truncated: false,
        }),
      })

    const { fetchAccessiblePlatformProjectIds } = await import('../lib/project-access')
    const ids = await fetchAccessiblePlatformProjectIds('user-1')
    expect(ids).toEqual(new Set(['pp-1', 'pp-2']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
