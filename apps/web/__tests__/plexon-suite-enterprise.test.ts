import { afterEach, describe, expect, it, vi } from 'vitest'
import { postCollectionActivityDistillate } from '../lib/plexon-collection-activity'
import { postSuiteAuditEvent } from '../lib/plexon-suite-audit'

describe('plexon suite enterprise clients (audion)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('POSTs audit when plexon auth configured', async () => {
    vi.stubEnv('PLEXON_AUTH_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await postSuiteAuditEvent({
        platformProjectId: 'pp-1',
        productId: 'audion',
        action: 'run_finished',
        actorUserId: 'u1',
        subjectRef: 'run-1',
      }),
    ).toBe(true)
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toMatchObject({
      productId: 'audion',
      action: 'run_finished',
    })
  })

  it('POSTs activity distillate', async () => {
    vi.stubEnv('PLEXON_AUTH_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await postCollectionActivityDistillate({
      platformProjectId: 'pp-1',
      productId: 'audion',
      kind: 'research_run',
      status: 'completed',
      subjectRef: 'run-1',
      title: 'Research',
    })
    expect(fetchMock.mock.calls[0][0]).toContain('/activity')
  })
})
