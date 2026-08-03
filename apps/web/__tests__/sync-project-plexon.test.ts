import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resetProjectStore,
  storeCreateProject,
  storeApplyPlatformBinding,
  storeProjectDetail,
} from '../lib/fixtures/project-store'
import { syncProjectToPlexon } from '../lib/sync-project-plexon'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/plexon-project-origin', () => ({
  registerAudionProjectOnPlexon: vi.fn(async () => ({
    platformProjectId: 'pp-bosch-1',
    checkionProjectId: 'chk-bosch-1',
    platformCompanyId: 'co-1',
  })),
}))

vi.mock('../lib/runtime-config', async () => {
  const actual = await vi.importActual<typeof import('../lib/runtime-config')>(
    '../lib/runtime-config',
  )
  return {
    ...actual,
    isPlexonAuthConfigured: vi.fn(() => true),
    getPlexonDemoOwnerUserId: vi.fn(() => 'user-demo'),
    getPlexonDemoCompanyId: vi.fn(() => 'co-demo'),
  }
})

describe('syncProjectToPlexon', () => {
  afterEach(() => {
    resetProjectStore()
    vi.clearAllMocks()
  })

  it('returns alreadyBound when platformProjectId set', async () => {
    const project = await storeCreateProject({ name: 'Bound' })
    await storeApplyPlatformBinding(project.id, {
      platformProjectId: 'pp-existing',
      checkionProjectId: 'chk-existing',
    })
    const result = await syncProjectToPlexon(project.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.alreadyBound).toBe(true)
    expect(result.platformProjectId).toBe('pp-existing')
  })

  it('registers unbound project via origin + persists binding', async () => {
    const project = await storeCreateProject({ name: 'Bosch eBike' })
    const result = await syncProjectToPlexon(project.id, {
      ownerPlexonUserId: 'user-1',
      platformCompanyId: 'co-1',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.alreadyBound).toBe(false)
    expect(result.platformProjectId).toBe('pp-bosch-1')
    expect(result.checkionProjectId).toBe('chk-bosch-1')

    const detail = await storeProjectDetail(project.id)
    expect(detail?.platformProjectId).toBe('pp-bosch-1')
    expect(detail?.checkionProjectId).toBe('chk-bosch-1')
  })
})
