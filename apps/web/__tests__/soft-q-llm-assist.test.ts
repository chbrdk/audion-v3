import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UxWaveRunItem } from '@audion-v3/contracts'
import { draftSoftScoresFromValidRuns, softScoreLooksHandFilled } from '../lib/soft-q-draft'
import {
  assistSoftScoresWithLlm,
  isSoftQLlmAssistEnabled,
  mergeLlmSoftScoreSuggestions,
} from '../lib/soft-q-llm-assist'
import { paths } from '../lib/paths'

function validConfusionRun(overrides: Partial<UxWaveRunItem> = {}): UxWaveRunItem {
  return {
    id: 'run-lab-soft-q-llm',
    runKey: 'B-aufgabe1-nachruesten',
    leitfadenBlock: 'lab',
    personaId: 'persona-alex-lab-impatient',
    personaName: 'Alex Lab',
    segment: 'owner_upgrade',
    url: 'https://example.test/tool',
    task: 'Nachrüsten',
    maxSteps: 10,
    jobId: 'job-soft-q-llm',
    agentStatus: 'complete',
    agentSuccess: true,
    taskCompleted: true,
    validEvidence: true,
    validEvidenceCaveat: null,
    blockers: [],
    steps: 5,
    frictionScore: 8,
    personaFitScore: 7,
    goalReached: false,
    finding:
      'Die Matrix zeigt Optionen grau und ausgeblendet — Filterlogik unklar, ich breche ab.',
    categories: null,
    ...overrides,
  }
}

describe('soft-q-llm-assist L6b', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is off by default', () => {
    vi.stubEnv(paths.envSoftQLlmAssist, '')
    expect(isSoftQLlmAssistEnabled()).toBe(false)
  })

  it('enables via AUDION_SOFT_Q_LLM_ASSIST=1', () => {
    vi.stubEnv(paths.envSoftQLlmAssist, '1')
    expect(isSoftQLlmAssistEnabled()).toBe(true)
  })

  it('returns rule draft when assist disabled', async () => {
    vi.stubEnv(paths.envSoftQLlmAssist, '0')
    const rule = draftSoftScoresFromValidRuns([validConfusionRun()])
    const result = await assistSoftScoresWithLlm(rule, [validConfusionRun()])
    expect(result.applied).toBe(false)
    expect(result.softScores.Q2_bedienbarkeit?.value).toBe(2)
    expect(result.note).toMatch(/off/i)
  })

  it('clamps LLM numeric values to ±1 of rule draft', () => {
    const rule = draftSoftScoresFromValidRuns([validConfusionRun()])
    expect(rule.Q2_bedienbarkeit?.value).toBe(2)
    const merged = mergeLlmSoftScoreSuggestions(rule, {
      basis: 'from findings',
      scores: {
        Q2_bedienbarkeit: {
          value: 5,
          confidence: 0.9,
          rationale: 'Total easy UI',
        },
        Q3_filterlogik: {
          value: 1,
          confidence: 0.7,
          rationale: 'Filter völlig unklar laut Matrix grau',
        },
      },
    })
    expect(merged.Q2_bedienbarkeit?.value).toBe(3) // 2+1 clamp
    expect(merged.Q3_filterlogik?.value).toBe(1) // 2-1 clamp
    expect(String(merged.Q2_bedienbarkeit?.rationale)).toMatch(/^LLM-assist:/)
    expect(softScoreLooksHandFilled(merged.Q2_bedienbarkeit)).toBe(false)
  })

  it('applies mocked LLM completion when forced', async () => {
    const rule = draftSoftScoresFromValidRuns([validConfusionRun()])
    const result = await assistSoftScoresWithLlm(rule, [validConfusionRun()], {
      force: true,
      completeJson: async () => ({
        basis: 'Mock assist',
        scores: {
          Q2_bedienbarkeit: {
            value: 2,
            confidence: 0.7,
            rationale: 'Matrix grau — Bedienung schwach',
          },
          Q3_filterlogik: {
            value: 2,
            confidence: 0.75,
            rationale: 'Filterlogik ohne Erklärung',
          },
        },
      }),
    })
    expect(result.applied).toBe(true)
    expect(result.softScores.Q2_bedienbarkeit?.value).toBe(2)
    expect(String(result.softScores.Q2_bedienbarkeit?.rationale)).toMatch(/LLM-assist/)
    expect(result.note).toMatch(/LLM assist refined/i)
  })

  it('falls back to rule draft on LLM error', async () => {
    const rule = draftSoftScoresFromValidRuns([validConfusionRun()])
    const result = await assistSoftScoresWithLlm(rule, [validConfusionRun()], {
      force: true,
      completeJson: async () => {
        throw new Error('quota exceeded')
      },
    })
    expect(result.applied).toBe(false)
    expect(result.softScores).toEqual(rule)
    expect(result.note).toMatch(/failed/i)
  })
})
