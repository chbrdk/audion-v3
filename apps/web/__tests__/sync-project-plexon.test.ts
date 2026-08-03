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
  registerAudionProjectOnPlexonDetailed: vi.fn(async () => ({
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

vi.mock('../lib/knowledge-pack-autosync', () => ({
  scheduleResearchBriefAutosync: vi.fn(),
}))

describe('syncProjectToPlexon', () => {
  afterEach(() => {
    resetProjectStore()
    vi.clearAllMocks()
  })

  it('returns alreadyBound when platformProjectId set and schedules knowledge autosync', async () => {
    const { scheduleResearchBriefAutosync } = await import('../lib/knowledge-pack-autosync')
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
    expect(result.knowledgeAutosyncScheduled).toBe(true)
    expect(scheduleResearchBriefAutosync).toHaveBeenCalledWith(project.id)
  })

  it('registers unbound project via origin + persists binding + schedules knowledge', async () => {
    const { scheduleResearchBriefAutosync } = await import('../lib/knowledge-pack-autosync')
    const project = await storeCreateProject({ name: 'Bosch eBike' })
    const result = await syncProjectToPlexon(project.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.alreadyBound).toBe(false)
    expect(result.platformProjectId).toBe('pp-bosch-1')
    expect(result.checkionProjectId).toBe('chk-bosch-1')
    expect(result.knowledgeAutosyncScheduled).toBe(true)
    expect(scheduleResearchBriefAutosync).toHaveBeenCalledWith(project.id)

    const detail = await storeProjectDetail(project.id)
    expect(detail?.platformProjectId).toBe('pp-bosch-1')
    expect(detail?.checkionProjectId).toBe('chk-bosch-1')
  })
})
