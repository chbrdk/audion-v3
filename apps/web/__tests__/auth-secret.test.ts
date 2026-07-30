import { afterEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../lib/paths'
import { getAuthSecret } from '../lib/auth-secret'

describe('getAuthSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses AUTH_SECRET when long enough', () => {
    vi.stubEnv(paths.envAuthSecret, 'abcdefghijklmnopqrstuvwxyz012345')
    expect(getAuthSecret()).toBe('abcdefghijklmnopqrstuvwxyz012345')
  })

  it('falls back to local secret when unset', () => {
    vi.stubEnv(paths.envAuthSecret, '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(getAuthSecret()).toBe(paths.authDevFallbackSecret)
  })
})
