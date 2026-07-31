import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetPersonaStore, storePersonaDetail } from '../lib/fixtures/persona-store'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { runNativeEnrichPersona, runNativeSuggestPersonaField } from '../lib/ai-workflows-native'
import { runAssist, runAssistJson } from '../lib/ai/assist'

vi.mock('../lib/ai/assist', async () => {
  const actual = await vi.importActual<typeof import('../lib/ai/assist')>('../lib/ai/assist')
  return {
    ...actual,
    runAssist: vi.fn(),
    runAssistJson: vi.fn(),
  }
})

describe('native AI workflows (mocked assist)', () => {
  beforeEach(() => {
    resetPersonaStore()
    vi.stubEnv('NEXT_AI_RUNTIME', 'native')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('suggestPersonaField returns stubbed:false with suggestions', async () => {
    const personaId = DEMO_PERSONAS[0]!.id
    vi.mocked(runAssist).mockResolvedValue({
      ok: true,
      text: '{}',
      json: { items: [{ title: 'Signal craft' }] },
      suggestions: [{ id: 's1', title: 'Signal craft', subtitle: null, description: null }],
    })
    const result = await runNativeSuggestPersonaField(personaId, {
      field: 'interests',
      max_suggestions: 2,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(false)
    expect(result.suggestions[0]?.title).toBe('Signal craft')
  })

  it('enrichPersona patches store facets', async () => {
    const personaId = DEMO_PERSONAS[0]!.id
    vi.mocked(runAssistJson).mockResolvedValue({
      ok: true,
      text: '{}',
      data: {
        interests: ['Native evidence loops'],
        values: ['Clarity'],
        goals: [{ label: 'Ship with proof' }],
        frustrations: [{ label: 'Stale decks' }],
        traits: { Curious: 0.9 },
      },
    })
    const result = await runNativeEnrichPersona(personaId, {})
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(false)
    const patched = await storePersonaDetail(personaId)
    expect(patched?.interests).toContain('Native evidence loops')
  })
})
