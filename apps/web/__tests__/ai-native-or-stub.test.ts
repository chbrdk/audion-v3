import { afterEach, describe, expect, it, vi } from 'vitest'
import { withAiNativeOrStub } from '../lib/ai-workflows'
import {
  getAiRuntime,
  shouldPreferAiNative,
  shouldRequireAiNative,
} from '../lib/runtime-config'

describe('NEXT_AI_RUNTIME / withAiNativeOrStub', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to auto and stubs without API key', () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'auto')
    vi.stubEnv('OPENAI_API_KEY', '')
    expect(getAiRuntime()).toBe('auto')
    expect(shouldPreferAiNative()).toBe(false)
  })

  it('prefers native in auto when OPENAI_API_KEY set', () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'auto')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    expect(shouldPreferAiNative()).toBe(true)
    expect(shouldRequireAiNative()).toBe(false)
  })

  it('uses stub when NEXT_AI_RUNTIME=stub even with key', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const live = vi.fn(async (): Promise<{ stubbed: boolean; ok: true }> => ({
      stubbed: false,
      ok: true,
    }))
    const request = new Request('http://localhost/api/ai', { method: 'POST' })
    const resolved = await withAiNativeOrStub(
      request,
      live,
      (): { stubbed: boolean; ok: true } => ({ stubbed: true, ok: true }),
    )
    expect(resolved).toEqual({ ok: true, data: { stubbed: true, ok: true } })
    expect(live).not.toHaveBeenCalled()
  })

  it('falls back to stub in auto when native fails', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'auto')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const request = new Request('http://localhost/api/ai', { method: 'POST' })
    const resolved = await withAiNativeOrStub(
      request,
      async () => ({ error: 'down', status: 502 }),
      () => ({ stubbed: true as const, source: 'stub' }),
    )
    expect(resolved).toEqual({ ok: true, data: { stubbed: true, source: 'stub' } })
  })

  it('requires native in native mode', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'native')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const request = new Request('http://localhost/api/ai', { method: 'POST' })
    const resolved = await withAiNativeOrStub(
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
