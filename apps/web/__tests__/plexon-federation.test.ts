import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
  getPlexonContractHeaders,
  isProvisioningAuthorized,
} from '../lib/plexon-contract'
import { paths } from '../lib/paths'

describe('plexon-contract', () => {
  it('exposes federation contract version from paths', () => {
    expect(PLEXON_FEDERATION_CONTRACT_VERSION).toBe(paths.plexonFederationContractVersion)
  })

  it('builds service headers', () => {
    const headers = getPlexonContractHeaders('secret-1') as Record<string, string>
    expect(headers[PLEXON_CONTRACT_VERSION_HEADER]).toBe(PLEXON_FEDERATION_CONTRACT_VERSION)
    expect(headers[PLEXON_SERVICE_SECRET_HEADER]).toBe('secret-1')
  })

  it('authorizes provisioning when secret + contract match', () => {
    const ok = new Request('http://localhost/api/platform/provisioning/users/u1', {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: 'shared',
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
      },
    })
    expect(isProvisioningAuthorized(ok, 'shared')).toBe(true)
  })

  it('rejects provisioning without secret or wrong version', () => {
    const noSecret = new Request('http://localhost/x', {
      headers: { [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION },
    })
    expect(isProvisioningAuthorized(noSecret, 'shared')).toBe(false)

    const badVersion = new Request('http://localhost/x', {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: 'shared',
        [PLEXON_CONTRACT_VERSION_HEADER]: 'wrong',
      },
    })
    expect(isProvisioningAuthorized(badVersion, 'shared')).toBe(false)
  })
})

describe('plexon-auth helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('isPlexonAuthConfigured requires both env vars', async () => {
    vi.stubEnv(paths.envPlexonAuthUrl, '')
    vi.stubEnv(paths.envPlexonServiceSecret, '')
    const { isPlexonAuthConfigured } = await import('../lib/plexon-auth')
    expect(isPlexonAuthConfigured()).toBe(false)

    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    expect(isPlexonAuthConfigured()).toBe(true)
  })

  it('validateCredentialsWithPlexon returns null when not configured', async () => {
    vi.stubEnv(paths.envPlexonAuthUrl, '')
    vi.stubEnv(paths.envPlexonServiceSecret, '')
    const { validateCredentialsWithPlexon } = await import('../lib/plexon-auth')
    await expect(validateCredentialsWithPlexon('a@b.c', 'pw')).resolves.toBeNull()
  })

  it('validateCredentialsWithPlexon returns user on 200', async () => {
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'u1', email: 'a@b.c', name: 'Ada' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { validateCredentialsWithPlexon } = await import('../lib/plexon-auth')
    await expect(validateCredentialsWithPlexon('A@B.C', 'pw')).resolves.toEqual({
      id: 'u1',
      email: 'a@b.c',
      name: 'Ada',
    })
    expect(fetchMock).toHaveBeenCalled()
    const [, init] = fetchMock.mock.calls[0]!
    expect((init as RequestInit).headers).toMatchObject({
      [PLEXON_SERVICE_SECRET_HEADER]: 'sec',
      [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
    })
  })

  it('validateCredentialsWithPlexon returns null on 401', async () => {
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const { validateCredentialsWithPlexon } = await import('../lib/plexon-auth')
    await expect(validateCredentialsWithPlexon('a@b.c', 'bad')).resolves.toBeNull()
  })
})
