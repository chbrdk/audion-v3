import { afterEach, describe, expect, it } from 'vitest'
import {
  resetJourneyValidationStore,
  storeAppendValidationReport,
  storeGetValidationReport,
  storeLatestValidationReport,
  storeListValidationReports,
} from '../lib/fixtures/journey-validation-store'

afterEach(() => {
  resetJourneyValidationStore()
})

describe('journey validation report store', () => {
  it('appends reports newest-first and caps per journey', () => {
    const first = storeAppendValidationReport({
      stubbed: true,
      workflowId: 'validateJourney',
      target: {
        method: 'POST',
        path: '/journeys/j1/validate',
        body: {},
      },
      journeyId: 'j1',
      mode: 'automated',
      overallFitScore: 50,
      validatedAt: '2026-07-30T09:00:00.000Z',
      personaId: 'p1',
      phases: [],
    })
    const second = storeAppendValidationReport({
      stubbed: true,
      workflowId: 'validateJourney',
      target: {
        method: 'POST',
        path: '/journeys/j1/validate',
        body: {},
      },
      journeyId: 'j1',
      mode: 'chat',
      overallFitScore: 70,
      validatedAt: '2026-07-30T10:00:00.000Z',
      personaId: 'p1',
      phases: [],
    })

    expect(storeLatestValidationReport('j1')?.reportId).toBe(second.reportId)
    expect(storeListValidationReports('j1').items.map((i) => i.id)).toEqual([
      second.reportId,
      first.reportId,
    ])
    expect(storeGetValidationReport('j1', first.reportId)?.mode).toBe('automated')
  })
})
