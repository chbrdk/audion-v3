import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetResearchRuns,
  storeCreateResearchRun,
  storeResearchLatest,
  storeResearchStatus,
  storeCompleteResearchRun,
  storeMarkResearchRunning,
  storeAppendResearchEvent,
} from '../lib/fixtures/research-runs'

describe('native research fixture spine', () => {
  beforeEach(() => {
    resetResearchRuns()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('tracks native run to succeeded with summary', () => {
    const projectId = 'proj-demo'
    const runId = storeCreateResearchRun(projectId, 'https://example.com', false)
    storeMarkResearchRunning(runId)
    storeAppendResearchEvent(runId, 'synthesize_start', 'Synthesizing')
    storeCompleteResearchRun(runId, [
      {
        key: 'overview',
        title: 'Overview',
        claims: [{ text: 'Native summary', citations: ['https://example.com'] }],
      },
    ])
    const status = storeResearchStatus(projectId, runId)
    expect('events' in status).toBe(true)
    if (!('events' in status)) return
    expect(status.stubbed).toBe(false)
    expect(status.status).toBe('succeeded')
    const latest = storeResearchLatest(projectId)
    expect(latest.status).toBe('succeeded')
    expect(latest.summaryEn?.[0]?.claims[0]?.text).toBe('Native summary')
  })
})
