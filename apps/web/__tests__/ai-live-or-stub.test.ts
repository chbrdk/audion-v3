import { afterEach, describe, expect, it, vi } from 'vitest'
import { withAiLiveOrStub } from '../lib/ai-workflows'

describe('withAiLiveOrStub', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses stub when DATA_SOURCE=fixtures', async () => {
    vi.stubEnv('NEXT_PERSONA_DATA_SOURCE', 'fixtures')
    const live = vi.fn(async () => ({ stubbed: false as const, ok: true }))
    const request = new Request('http://localhost/api/ai', { method: 'POST' })
    const resolved = await withAiLiveOrStub(
      request,
      live,
      () => ({ stubbed: true as const, ok: true }),
    )
    expect(resolved).toEqual({ ok: true, data: { stubbed: true, ok: true } })
    expect(live).not.toHaveBeenCalled()
  })

  it('falls back to stub in auto when live fails', async () => {
    vi.stubEnv('NEXT_PERSONA_DATA_SOURCE', 'auto')
    const request = new Request('http://localhost/api/ai', { method: 'POST' })
    const resolved = await withAiLiveOrStub(
      request,
      async () => ({ error: 'down', status: 502 }),
      () => ({ stubbed: true as const, source: 'stub' }),
    )
    expect(resolved).toEqual({ ok: true, data: { stubbed: true, source: 'stub' } })
  })

  it('requires live in api mode', async () => {
    vi.stubEnv('NEXT_PERSONA_DATA_SOURCE', 'api')
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      headers: { authorization: 'Bearer x' },
    })
    const resolved = await withAiLiveOrStub(
      request,
      async () => ({ error: 'down', status: 502, detail: 'offline' }),
      () => ({ stubbed: true as const }),
    )
    expect(resolved).toEqual({
      ok: false,
      error: 'down',
      status: 502,
      detail: 'offline',
    })
  })
})
