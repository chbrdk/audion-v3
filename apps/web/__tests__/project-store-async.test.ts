import { afterEach, describe, expect, it } from 'vitest'
import {
  resetProjectStore,
  storeGetByPlatformProjectId,
  storeProjectList,
  storeUpsertByPlatformProjectId,
} from '../lib/fixtures/project-store'

describe('project store (memory fallback)', () => {
  afterEach(() => {
    resetProjectStore()
  })

  it('upserts by platform project id and lists the row', async () => {
    const created = await storeUpsertByPlatformProjectId('plat-persist-1', {
      name: 'Persist Me',
      platformCompanyId: 'co-1',
      ownerUserId: 'user-1',
      status: 'active',
    })
    expect(created.platformProjectId).toBe('plat-persist-1')
    expect(created.id).toMatch(/^proj-/)

    const found = await storeGetByPlatformProjectId('plat-persist-1')
    expect(found?.id).toBe(created.id)
    expect(found?.name).toBe('Persist Me')

    const again = await storeUpsertByPlatformProjectId('plat-persist-1', {
      name: 'Persist Me Renamed',
      platformCompanyId: 'co-1',
      ownerUserId: 'user-1',
      status: 'active',
    })
    expect(again.id).toBe(created.id)
    expect(again.name).toBe('Persist Me Renamed')

    const list = await storeProjectList()
    expect(list.items.some((i) => i.id === created.id)).toBe(true)
  })
})
