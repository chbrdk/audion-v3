import { describe, expect, it } from 'vitest'
import { storeProjectList, storeUpsertByPlatformProjectId } from '../lib/fixtures/project-store'

describe('audion project list hides archived federation mirrors', () => {
  it('excludes archived from storeProjectList', async () => {
    const created = await storeUpsertByPlatformProjectId(`plx-arch-${Date.now()}`, {
      name: 'Archived Audion',
      platformCompanyId: 'co-1',
      ownerUserId: 'u-1',
      status: 'archived',
    })
    const list = await storeProjectList()
    expect(list.items.some((p) => p.id === created.id)).toBe(false)
  })
})
