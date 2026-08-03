import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishProjectResearchBrief } from '../lib/knowledge-pack-autosync'

describe('knowledge-pack-autosync (audion)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('soft-skips when plexon auth is not configured', async () => {
    vi.stubEnv('PLEXON_AUTH_URL', '')
    vi.stubEnv('PLEXON_SERVICE_SECRET', '')
    const result = await publishProjectResearchBrief({
      projectId: 'proj-audion-core',
      soft: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.skipped).toBe(true)
      expect(result.error).toBe('plexon_not_configured')
    }
  })
})
