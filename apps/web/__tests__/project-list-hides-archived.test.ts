import { describe, expect, it } from 'vitest'
import {
  storeArchiveProject,
  storeCreateProject,
  storeProjectDetail,
  storeProjectList,
  storeUpsertByPlatformProjectId,
} from '../lib/fixtures/project-store'
import { isRealPlatformProjectId, needsPlexonOrigin } from '../lib/plexon-platform-id'

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

describe('storeArchiveProject', () => {
  it('archives without removing the row', async () => {
    const created = await storeCreateProject({
      name: `Archive me ${Date.now()}`,
      status: 'published',
    })
    const archived = await storeArchiveProject(created.id)
    expect(archived?.status).toBe('archived')
    expect(await storeProjectDetail(created.id)).not.toBeNull()
    const list = await storeProjectList()
    expect(list.items.some((p) => p.id === created.id)).toBe(false)
  })
})

describe('plexon platform id', () => {
  it('detects real Collection UUIDs', () => {
    expect(isRealPlatformProjectId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true)
    expect(isRealPlatformProjectId('plx-local-demo')).toBe(false)
    expect(needsPlexonOrigin('plx-local-demo')).toBe(true)
  })
})
