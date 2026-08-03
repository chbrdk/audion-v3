import { describe, expect, it } from 'vitest'
import type { UxWaveRunItem } from '@audion-v3/contracts'
import type { UxJourneyAgentJobStatus } from '../lib/ux-journey-agent-client'
import {
  hasUsableUxSubstance,
  inferInfrastructureBlockers,
  inferValidEvidence,
  isJunkEvidenceRun,
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

  it('uses result.summary / result.error instead of opaque Agent error', () => {
    const status: UxJourneyAgentJobStatus = {
      jobId: 'job-2',
      status: 'complete',
      result: {
        success: false,
        summary: 'Agent stopped after 7 steps (6 failed). Last error: Could not parse response',
        error: 'Could not parse response',
        steps: [
          { step: 1, action: 'navigate', result: 'ok' },
          { step: 2, action: 'error', result: 'Could not parse response' },
        ],
      },
    }
    const mapped = mapAgentResultToWaveRun(baseRun(), status)
    expect(mapped.agentSuccess).toBe(false)
    expect(mapped.finding).toContain('Could not parse response')
    expect(mapped.finding).not.toBe('Agent error')
  })

  it('rejects cancelled runs as invalid evidence (L5)', () => {
    const status: UxJourneyAgentJobStatus = {
      jobId: 'job-c',
      status: 'complete',
      result: {
        success: false,
        cancelled: true,
        summary: 'Run was cancelled before completion.',
        steps: [{ step: 1, action: 'navigate', result: 'ok', reasoning: 'Ich starte die Seite und schaue mir die Navigation an.' }],
      },
    }
    const mapped = mapAgentResultToWaveRun(baseRun(), status)
    expect(mapped.agentSuccess).toBe(false)
    expect(mapped.validEvidence).toBe(false)
    expect(mapped.validEvidenceCaveat).toMatch(/cancelled/i)
  })

  it('rejects empty crash runs without Think-Aloud (L5)', () => {
    expect(
      isJunkEvidenceRun({
        summary: 'Agent error',
        error: 'Could not parse response',
        steps: [{ step: 1, action: 'error', result: 'fail' }],
        agentSuccess: false,
        taskCompleted: false,
      }).junk,
    ).toBe(true)

    const evidence = inferValidEvidence({
      agentSuccess: false,
      taskCompleted: false,
      blockers: [],
      summary: '',
      steps: [],
    })
    expect(evidence.validEvidence).toBe(false)
    expect(evidence.validEvidenceCaveat).toMatch(/empty/i)
  })

  it('accepts honest abandon with Think-Aloud even when goal unmet (L5)', () => {
    const status: UxJourneyAgentJobStatus = {
      jobId: 'job-abandon',
      status: 'complete',
      result: {
        success: true,
        summary: '',
        steps: [
          {
            step: 1,
            action: 'click',
            reasoning: 'Ich sehe graue Displays und verstehe die Filterlogik nicht.',
            thinkAloud: {
              think: 'Die Optionen sind grau ohne Erklärung — das frustriert mich.',
              seen: 'Displays ausgegraut nach Performance Line.',
            },
          },
          {
            step: 2,
            action: 'done',
            result:
              'Ich breche ab: nach zwei unerklärten grau/disabled Momenten keine sichere Display-Antwort.',
          },
        ],
        scorecard: {
          frictionScore: 8,
          personaFitScore: 3,
          coverage: { goalReached: false },
          confusion: { tagCount: 2 },
        },
      },
    }
    const mapped = mapAgentResultToWaveRun(baseRun({ runKey: 'B-aufgabe1-nachruesten' }), status)
    expect(mapped.taskCompleted).toBe(false)
    expect(mapped.goalReached).toBe(false)
    expect(hasUsableUxSubstance({ steps: status.result?.steps, confusionTagCount: 2 })).toBe(true)
    expect(mapped.validEvidence).toBe(true)
  })
})
