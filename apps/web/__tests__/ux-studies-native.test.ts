import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetUxStudyStore, storeUxWaveDetail } from '../lib/fixtures/ux-study-store'
import { syncUxWaveNativeOrFixture } from '../lib/ux-studies-native'
import { runAssistJson } from '../lib/ai/assist'

vi.mock('../lib/ai/assist', async () => {
  const actual = await vi.importActual<typeof import('../lib/ai/assist')>('../lib/ai/assist')
  return { ...actual, runAssistJson: vi.fn() }
})

describe('ux-studies-native sync', () => {
  beforeEach(() => {
    resetUxStudyStore()
    vi.stubEnv('NEXT_AI_RUNTIME', 'native')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('applies LLM findings on sync when native AI preferred', async () => {
    vi.mocked(runAssistJson).mockResolvedValue({
      ok: true,
      text: '{}',
      data: {
        outcome: 'pass',
        summary: 'Native agent found a clear path.',
        findings: [{ severity: 'low', title: 'Clarity', detail: 'Labels ok' }],
        quotes: ['Looks fine'],
      },
    })
    const waveId = 'wave-phase2-plan-draft'
    const wave = storeUxWaveDetail('study-ebm-produktkombinationen', waveId)
    expect(wave).toBeTruthy()
    const synced = await syncUxWaveNativeOrFixture('study-ebm-produktkombinationen', waveId)
    expect(synced?.status).toBe('complete')
    expect(synced?.runs.some((r) => (r.finding || '').includes('Native agent'))).toBe(true)
  })

  it('falls back to fixture sync when AI stubbed', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    const synced = await syncUxWaveNativeOrFixture(
      'study-ebm-produktkombinationen',
      'wave-phase2-plan-draft',
    )
    expect(runAssistJson).not.toHaveBeenCalled()
    expect(synced).toBeTruthy()
  })
})
