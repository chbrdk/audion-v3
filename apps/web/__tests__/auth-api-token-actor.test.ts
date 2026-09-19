import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/runtime-config', () => ({
  getPlexonServiceSecret: vi.fn(() => 'svc-secret'),
}))

vi.mock('../lib/fixtures/api-tokens-store', () => ({
  resolveApiTokenOwner: vi.fn(() => ({ ownerId: 'token-owner', tokenId: 'tok-1' })),
}))

vi.mock('../auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'session-user' } })),
}))

import { getPlexonServiceSecret } from '../lib/runtime-config'
import {
  getRequestUser,
  isAudionMachineEnvToken,
  PLEXON_USER_ID_HEADER,
} from '../lib/auth-api-token'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '../lib/plexon-contract'
import { paths } from '../lib/paths'

describe('Audion getRequestUser machine → actor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPlexonServiceSecret).mockReturnValue('svc-secret')
    process.env[paths.audionApiTokenEnvKey] = 'audion_machine_token_env_value'
  })

  afterEach(() => {
    delete process.env[paths.audionApiTokenEnvKey]
  })

  it('machine Bearer + actor returns actor', async () => {
    expect(isAudionMachineEnvToken('Bearer audion_machine_token_env_value')).toBe(true)
    const req = new Request('http://localhost/api/projects/p1', {
      headers: {
        Authorization: 'Bearer audion_machine_token_env_value',
        [PLEXON_USER_ID_HEADER]: 'actor-a',
      },
    })
    expect(await getRequestUser(req)).toEqual({ id: 'actor-a' })
  })

  it('machine Bearer without actor fails closed', async () => {
    const req = new Request('http://localhost/api/projects/p1', {
      headers: { Authorization: 'Bearer audion_machine_token_env_value' },
    })
    expect(await getRequestUser(req)).toBeNull()
  })

  it('service secret + actor works', async () => {
    const req = new Request('http://localhost/api/projects/p1', {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: 'svc-secret',
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        [PLEXON_USER_ID_HEADER]: 'actor-b',
      },
    })
    expect(await getRequestUser(req)).toEqual({ id: 'actor-b' })
  })
})
