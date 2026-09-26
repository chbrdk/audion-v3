import { afterEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../lib/paths'
import {
  parseOpenAiUsage,
  reportLlmUsage,
  reportRetrievalQuery,
  reportUsage,
  reportVendorCostUsd,
  runWithUsageUserId,
} from '../lib/usage-report'

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
    reportUsage({ userId: 'u1', eventType: 'llm_request', rawUnits: {} })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts llm_request with real tokens', () => {
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    reportLlmUsage({
      userId: 'u1',
      usage: { input_tokens: 100, output_tokens: 40, model: 'gpt-test' },
      surface: 'chat.message.stream',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/api/services/usage/events')
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      user_id: 'u1',
      service: 'audion',
      event_type: 'llm_request',
      raw_units: {
        input_tokens: 100,
        output_tokens: 40,
        model: 'gpt-test',
        surface: 'chat.message.stream',
      },
    })
  })

  it('posts retrieval_query and vendor_cost via ALS user', () => {
    vi.stubEnv(paths.envPlexonAuthUrl, 'https://plexon.example')
    vi.stubEnv(paths.envPlexonServiceSecret, 'sec')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    runWithUsageUserId('als-user', () => {
      reportRetrievalQuery({ queries: 1, projectId: 'p1', surface: 'chat.rag' })
      reportVendorCostUsd({ costUsd: 0.002, surface: 'jev.test' })
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const bodies = fetchMock.mock.calls.map((c) =>
      JSON.parse(String((c[1] as RequestInit).body)),
    )
    expect(bodies[0]).toMatchObject({
      user_id: 'als-user',
      event_type: 'retrieval_query',
    })
    expect(bodies[1]).toMatchObject({
      user_id: 'als-user',
      event_type: 'vendor_cost',
      raw_units: { cost_usd: 0.002 },
    })
  })

  it('parseOpenAiUsage prefers vendor block over estimate', () => {
    expect(
      parseOpenAiUsage({ prompt_tokens: 12, completion_tokens: 3 }, { content: 'hello' }),
    ).toEqual({ input_tokens: 12, output_tokens: 3, model: undefined })
    const estimated = parseOpenAiUsage(null, { system: 'abcd', user: 'efgh', content: 'ijkl' })
    expect(estimated.estimated).toBe(true)
    expect(estimated.input_tokens).toBe(2)
    expect(estimated.output_tokens).toBe(1)
  })
})
