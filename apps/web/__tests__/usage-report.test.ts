import { afterEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../lib/paths'
import { reportUsage } from '../lib/usage-report'

describe('reportUsage', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('no-ops when Plexon is not configured', () => {
    vi.stubEnv(paths.envPlexonAuthUrl, '')
    vi.stubEnv(paths.envPlexonServiceSecret, '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    reportUsage({ userId: 'u1', eventType: 'chat.message.stream', rawUnits: {} })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts usage event when configured', () => {
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    reportUsage({
      userId: 'u1',
      eventType: 'chat.message.stream',
      rawUnits: { persona_id: 'p1' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/api/services/usage/events')
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      user_id: 'u1',
      service: 'audion',
      event_type: 'chat.message.stream',
    })
  })
})
