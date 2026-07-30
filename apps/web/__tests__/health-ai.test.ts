import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../app/api/health/route'

describe('health ai status', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports stub chat when no key', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'auto')
    vi.stubEnv('OPENAI_API_KEY', '')
    const res = await GET()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.ai.openaiConfigured).toBe(false)
    expect(json.ai.chatNative).toBe(false)
  })

  it('reports native chat when auto + key', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'auto')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const res = await GET()
    const json = await res.json()
    expect(json.ai.openaiConfigured).toBe(true)
    expect(json.ai.chatNative).toBe(true)
  })
})
