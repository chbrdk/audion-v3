import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getSettingsProviders,
  listAssistTemplates,
  testAssistPrompt,
} from '../lib/settings-admin'

vi.mock('../lib/ai/assist', () => ({
  runAssist: vi.fn(async () => ({
    ok: true as const,
    text: '{"items":[{"title":"Native item"}]}',
    json: { items: [{ title: 'Native item' }] },
    suggestions: [{ id: 'n-1', title: 'Native item' }],
  })),
}))

describe('settings-admin providers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports openai configured when key is set', () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'auto')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubEnv('PLEXON_AUTH_URL', '')
    vi.stubEnv('PLEXON_SERVICE_SECRET', '')
    const data = getSettingsProviders()
    expect(data.defaultProvider).toBe('openai')
    expect(data.aiRuntime).toBe('auto')
    expect(data.chatNative).toBe(true)
    const openai = data.providers.find((p) => p.id === 'openai')
    expect(openai?.configured).toBe(true)
    expect(openai?.model).toBeTruthy()
  })

  it('reports stub when runtime is stub even with key', () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const data = getSettingsProviders()
    expect(data.aiRuntime).toBe('stub')
    expect(data.chatNative).toBe(false)
  })
})

describe('settings-admin prompts', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists assist templates', () => {
    const { templates } = listAssistTemplates()
    expect(templates.length).toBeGreaterThan(5)
    expect(templates.some((t) => t.id === 'project.suggest_target_groups')).toBe(true)
  })

  it('returns stub payload when AI is not preferred', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    vi.stubEnv('OPENAI_API_KEY', '')
    const result = await testAssistPrompt({
      templateId: 'persona.interests',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.templateId).toBe('persona.interests')
    expect(result.suggestions[0]?.title).toContain('Stub')
  })

  it('calls native assist when preferred', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'native')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const { runAssist } = await import('../lib/ai/assist')
    const result = await testAssistPrompt({
      templateId: 'persona.interests',
      context: 'Bike brand',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(false)
    expect(result.suggestions[0]?.title).toBe('Native item')
    expect(runAssist).toHaveBeenCalled()
  })

  it('rejects unknown templateId', async () => {
    const result = await testAssistPrompt({ templateId: 'not.a.template' })
    expect(result).toEqual({
      error: 'Unknown templateId: not.a.template',
      status: 400,
    })
  })

  it('requires templateId', async () => {
    expect(await testAssistPrompt({ templateId: '' })).toEqual({
      error: 'templateId is required',
      status: 400,
    })
  })
})
