import { describe, expect, it } from 'vitest'
import type { UxWaveRunItem } from '@audion-v3/contracts'
import type { UxJourneyAgentJobStatus } from '../lib/ux-journey-agent-client'
import {
  inferInfrastructureBlockers,
  inferValidEvidence,
  mapAgentResultToWaveRun,
} from '../lib/ux-wave-scorecard'

const baseRun = (overrides: Partial<UxWaveRunItem> = {}): UxWaveRunItem => ({
  id: 'run-1',
  runKey: 'A-erstkontakt',
  leitfadenBlock: null,
  personaId: 'persona-alex-nachruester',
  personaName: 'Alex',
  segment: 'owner_upgrade',
  url: 'https://example.test',
  task: 'Explore',
  maxSteps: 12,
  jobId: 'job-1',
  agentStatus: 'running',
  agentSuccess: null,
  taskCompleted: null,
  validEvidence: null,
  validEvidenceCaveat: null,
  blockers: [],
  steps: null,
  frictionScore: null,
  personaFitScore: null,
  goalReached: null,
  finding: null,
  categories: {},
  ...overrides,
})

describe('ux-wave-scorecard', () => {
  it('detects cloudfront 403 blockers', () => {
    expect(inferInfrastructureBlockers('CloudFront 403 Access Denied')).toContain(
      'cloudfront_403',
    )
    expect(inferInfrastructureBlockers('see web.archive.org snapshot')).toContain(
      'archive_org_workaround',
    )
  })

  it('marks 403-only runs as invalid evidence even if agentSuccess', () => {
    const evidence = inferValidEvidence({
      agentSuccess: true,
      taskCompleted: false,
      blockers: ['cloudfront_403'],
    })
    expect(evidence.validEvidence).toBe(false)
  })

  it('keeps validEvidence with caveat when task completed despite 403 trail', () => {
    const evidence = inferValidEvidence({
      agentSuccess: true,
      taskCompleted: true,
      blockers: ['cloudfront_403_intermittent'],
    })
    expect(evidence.validEvidence).toBe(true)
    expect(evidence.validEvidenceCaveat).toMatch(/403/)
  })

  it('maps scorecard friction/fit/categories onto the wave run', () => {
    const status: UxJourneyAgentJobStatus = {
      jobId: 'job-1',
      status: 'complete',
      result: {
        success: true,
        summary: 'Found displays',
        steps: [{ step: 1, action: 'click', result: 'ok' }],
        scorecard: {
          frictionScore: 9,
          personaFitScore: 2,
          coverage: { goalReached: true },
          perCategoryLLM: {
            layout: 0.22,
            navigation: { score: -1.56 },
          },
        },
      },
    }
    const mapped = mapAgentResultToWaveRun(baseRun({ runKey: 'B-aufgabe1-nachruesten' }), status)
    expect(mapped.validEvidence).toBe(true)
    expect(mapped.frictionScore).toBe(9)
    expect(mapped.personaFitScore).toBe(2)
    expect(mapped.categories.layout).toBe(0.22)
    expect(mapped.categories.navigation).toBe(-1.56)
    expect(mapped.taskCompleted).toBe(true)
  })

  it('does not equate agentSuccess alone with validEvidence on hard 403', () => {
    const status: UxJourneyAgentJobStatus = {
      jobId: 'job-1',
      status: 'complete',
      error: 'CloudFront returned 403',
      result: {
        success: true,
        summary: 'Blocked by CloudFront 403',
        steps: [{ result: '403 Access Denied' }],
        scorecard: { frictionScore: 10, personaFitScore: 0, coverage: { goalReached: false } },
      },
    }
    const mapped = mapAgentResultToWaveRun(baseRun(), status)
    expect(mapped.agentSuccess).toBe(true)
    expect(mapped.validEvidence).toBe(false)
    expect(mapped.blockers).toContain('cloudfront_403')
  })
})
