import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '../lib/plexon-contract'
import { paths } from '../lib/paths'
import {
  resetProjectStore,
  storeApplyPlatformBinding,
  storeCreateProject,
  storeGetProvisionedUser,
  storeProjectDetail,
} from '../lib/fixtures/project-store'

describe('project platform binding', () => {
  afterEach(() => {
    resetProjectStore()
    vi.restoreAllMocks()
  })

  it('stores owner from options and applies platformProjectId', () => {
    const created = storeCreateProject(
      { name: 'Federated' },
      {
        ownerEmail: 'owner@example.com',
        ownerPlexonUserId: 'plex-user-1',
        platformCompanyId: 'co-1',
      },
    )
    expect(created.members[0]?.email).toBe('owner@example.com')
    expect(created.ownerPlexonUserId).toBe('plex-user-1')
    expect(created.platformCompanyId).toBe('co-1')

    const bound = storeApplyPlatformBinding(created.id, {
      platformProjectId: 'plat-proj-9',
      platformCompanyId: 'co-1',
      ownerPlexonUserId: 'plex-user-1',
    })
    expect(bound?.platformProjectId).toBe('plat-proj-9')
    expect(storeProjectDetail(created.id)?.platformProjectId).toBe('plat-proj-9')
  })
})

describe('provisioning routes', () => {
  beforeEach(() => {
    resetProjectStore()
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'shared-secret')
  })

  afterEach(() => {
    resetProjectStore()
    vi.unstubAllEnvs()
  })

  it('rejects user provisioning without secret', async () => {
    const { PUT } = await import('../app/api/platform/provisioning/users/[id]/route')
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/users/u1', {
        method: 'PUT',
        body: JSON.stringify({
          email: 'a@b.c',
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
        }),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    )
    expect(res.status).toBe(401)
  })

  it('accepts user provisioning with secret + contract', async () => {
    const { PUT } = await import('../app/api/platform/provisioning/users/[id]/route')
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/users/u1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [PLEXON_SERVICE_SECRET_HEADER]: 'shared-secret',
          [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        },
        body: JSON.stringify({
          email: 'Ada@Example.com',
          name: 'Ada',
          desiredState: 'granted',
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
        }),
      }),
      { params: Promise.resolve({ id: 'u1' }) },
    )
    expect(res.status).toBe(200)
    expect(storeGetProvisionedUser('u1')).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada',
    })
  })

  it('accepts project provisioning and upserts fixture', async () => {
    const { PUT } = await import('../app/api/platform/provisioning/projects/[id]/route')
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/plat-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [PLEXON_SERVICE_SECRET_HEADER]: 'shared-secret',
          [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        },
        body: JSON.stringify({
          name: 'From Plexon',
          platformCompanyId: 'co-9',
          ownerUserId: 'owner-9',
          status: 'active',
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
        }),
      }),
      { params: Promise.resolve({ id: 'plat-1' }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { platformProjectId: string; projectId: string }
    expect(body.platformProjectId).toBe('plat-1')
    expect(storeProjectDetail(body.projectId)?.platformProjectId).toBe('plat-1')
  })
})

describe('registerAudionProjectOnPlexon', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns null when not configured', async () => {
    vi.stubEnv(paths.envPlexonAuthUrl, '')
    vi.stubEnv(paths.envPlexonServiceSecret, '')
    const { registerAudionProjectOnPlexon } = await import('../lib/plexon-project-origin')
    await expect(
      registerAudionProjectOnPlexon({
        audionProjectId: 'p1',
        name: 'N',
        ownerPlexonUserId: 'u1',
        platformCompanyId: 'c1',
      }),
    ).resolves.toBeNull()
  })

  it('returns platformProjectId from origin response', async () => {
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ platformProjectId: 'pp-1', platformCompanyId: 'c1' }),
      }),
    )
    const { registerAudionProjectOnPlexon } = await import('../lib/plexon-project-origin')
    await expect(
      registerAudionProjectOnPlexon({
        audionProjectId: 'p1',
        name: 'N',
        ownerPlexonUserId: 'u1',
        platformCompanyId: 'c1',
      }),
    ).resolves.toEqual({
      platformProjectId: 'pp-1',
      checkionProjectId: undefined,
      platformCompanyId: 'c1',
    })
  })
})
