import { afterEach, describe, expect, it } from 'vitest'
import { runStubConvertUxRunToJourney } from '../lib/journey-from-ux-run'
import { resetJourneyStore, storeJourneyDetail } from '../lib/fixtures/journey-store'
import { resetUxStudyStore, storeUxWaveDetail } from '../lib/fixtures/ux-study-store'
import { DEMO_UX_STUDIES, DEMO_UX_WAVES } from '../lib/fixtures/ux-studies'

afterEach(() => {
  resetJourneyStore()
  resetUxStudyStore()
})

describe('journey from UX run (stub)', () => {
  it('creates a journey from a study wave run and marks derivedJourneyId', async () => {
    const study = DEMO_UX_STUDIES[0]!
    const wave = DEMO_UX_WAVES.find((w) => w.studyId === study.id)!
    const run = wave.runs.find((r) => r.jobId) ?? wave.runs[0]!

    const result = await runStubConvertUxRunToJourney({
      studyId: study.id,
      waveId: wave.id,
      runKey: run.runKey,
      mode: 'deterministic',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.stubbed).toBe(true)
    expect(result.alreadyConverted).toBe(false)
    expect(result.journey.phaseCount).toBe(3)
    expect((await storeJourneyDetail(result.journey.id))?.phases).toHaveLength(3)

    const updated = await storeUxWaveDetail(study.id, wave.id)
    const marked = updated?.runs.find((r) => r.runKey === run.runKey)
    expect(marked?.derivedJourneyId).toBe(result.journey.id)

    const again = await runStubConvertUxRunToJourney({
      studyId: study.id,
      waveId: wave.id,
      runKey: run.runKey,
    })
    expect('error' in again).toBe(false)
    if ('error' in again) return
    expect(again.alreadyConverted).toBe(true)
    expect(again.journey.id).toBe(result.journey.id)
  })

  it('treats bare jobId as chat_inspect convert', async () => {
    const result = await runStubConvertUxRunToJourney({
      jobId: 'job-abc',
      url: 'https://example.com',
      task: 'Find pricing',
      mode: 'deterministic',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.journey.phaseCount).toBeGreaterThanOrEqual(3)
  })

  it('requires study/wave/run when not chat_inspect', async () => {
    expect(await runStubConvertUxRunToJourney({ source: 'study_wave' })).toMatchObject({
      error: expect.stringContaining('required'),
      status: 400,
    })
  })
})
