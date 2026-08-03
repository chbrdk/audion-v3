import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resetUxStudyStore,
  storeCreateUxStudy,
  storeCreateUxWave,
  storePatchUxWaveRuns,
  storeUxWaveDetail,
} from '../lib/fixtures/ux-study-store'
import { startUxWaveNativeOrFixture } from '../lib/ux-studies-native'

vi.mock('../lib/ux-journey-agent-client', () => ({
  isUxJourneyAgentConfigured: vi.fn(() => true),
  uxJourneyAgentStart: vi.fn(async () => ({ jobId: 'job-restart-1' })),
  uxJourneyAgentGet: vi.fn(),
}))

vi.mock('../lib/chat/resolve-agent-persona-context', () => ({
  resolveAgentPersonaContext: vi.fn(async () => ({ id: 'persona-1', name: 'Alex' })),
}))

describe('startUxWaveNativeOrFixture force restart', () => {
  afterEach(() => {
    resetUxStudyStore()
    vi.clearAllMocks()
  })

  it('re-queues complete runs when force=true', async () => {
    const study = await storeCreateUxStudy({ name: 'EBM' })
    const wave = await storeCreateUxWave(study.id, {
      waveKey: 'wave-1',
      runs: [
        {
          runKey: 'A-erstkontakt',
          url: 'https://example.com',
          task: 'Look around',
          personaId: 'persona-1',
        },
      ],
    })
    await storePatchUxWaveRuns(study.id, wave.id, [
      {
        ...wave.runs[0]!,
        agentStatus: 'complete',
        agentSuccess: true,
        validEvidence: false,
        blockers: ['cloudfront_403'],
        jobId: 'job-old',
        finding: 'Browser agent completed run.',
      },
    ])

    const withoutForce = await startUxWaveNativeOrFixture(study.id, wave.id)
    expect(withoutForce?.runs[0]?.agentStatus).toBe('complete')
    expect(withoutForce?.runs[0]?.jobId).toBe('job-old')

    const { uxJourneyAgentStart } = await import('../lib/ux-journey-agent-client')
    const forced = await startUxWaveNativeOrFixture(study.id, wave.id, { force: true })
    expect(uxJourneyAgentStart).toHaveBeenCalled()
    expect(forced?.status).toBe('running')
    expect(forced?.runs[0]?.agentStatus).toBe('running')
    expect(forced?.runs[0]?.jobId).toBe('job-restart-1')
    expect(forced?.runs[0]?.blockers).toEqual([])

    const detail = await storeUxWaveDetail(study.id, wave.id)
    expect(detail?.runs[0]?.jobId).toBe('job-restart-1')
  })
})
