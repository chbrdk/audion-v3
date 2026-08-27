import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeneratePhaseMomentsButton } from '../components/generate-phase-moments-button'
import { ValidateJourneyButton } from '../components/validate-journey-button'
import { resetJourneyStore, storeJourneyDetail } from '../lib/fixtures/journey-store'
import { resetTargetGroupStore } from '../lib/fixtures/target-group-store'
import { resetPersonaStore } from '../lib/fixtures/persona-store'
import { resetJourneyValidationStore } from '../lib/fixtures/journey-validation-store'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

beforeEach(() => {
  resetJourneyStore()
  resetTargetGroupStore()
  resetPersonaStore()
  resetJourneyValidationStore()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  resetJourneyStore()
  resetTargetGroupStore()
  resetPersonaStore()
  resetJourneyValidationStore()
})

describe('journey phase AI + validate UI', () => {
  it('Generate moments posts to phase generate route', async () => {
    const journey = (await storeJourneyDetail('journey-product-discovery'))!
    const phase = journey.phases[0]!
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stubbed: true,
        workflowId: 'generateJourneyPhaseMoments',
        applied: true,
        moments: phase.elements,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<GeneratePhaseMomentsButton journeyId={journey.id} phase={phase} />)
    fireEvent.click(screen.getByRole('button', { name: /Generate moments/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Generate$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiAiGenerateJourneyPhaseMoments(journey.id),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('Validate opens dialog, loads TG personas, and posts validate', async () => {
    const journey = (await storeJourneyDetail('journey-product-discovery'))!
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/validation-reports') && !String(url).match(/validation-reports\/[^/]+$/)) {
        return {
          ok: true,
          json: async () => ({ items: [], total: 0 }),
        }
      }
      if (String(url).includes('/api/target-groups/')) {
        return {
          ok: true,
          json: async () => ({
            id: 'tg-digital-product-leads',
            linkedPersonas: [
              { id: 'persona-alex-morgan', name: 'Alex Morgan', role: 'Product Lead' },
            ],
          }),
        }
      }
      if (init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            stubbed: true,
            workflowId: 'validateJourney',
            reportId: 'val-report-1',
            mode: 'chat',
            overallFitScore: 72,
            validatedAt: new Date().toISOString(),
            personaId: 'persona-alex-morgan',
            phases: [
              {
                phaseId: 'phase-signal',
                phaseName: 'Signal intake',
                fitScore: 72,
                status: 'good',
                frictionPoints: [
                  {
                    description: 'Persona voice check',
                    severity: 'low',
                    personaQuote: '“This phase feels clear.”',
                  },
                ],
                recommendations: [],
              },
            ],
          }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ValidateJourneyButton journey={journey} />)
    fireEvent.click(screen.getByRole('button', { name: /^Validate$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Fit this map against a persona/i)).toBeTruthy()
      expect(screen.getByLabelText(/Validation mode/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText(/Validation mode/i))
    fireEvent.click(screen.getByRole('option', { name: /Chat mode/i }))
    fireEvent.click(screen.getByRole('button', { name: /Run validation/i }))

    await waitFor(() => {
      const validateCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]) === paths.routes.apiAiValidateJourney(journey.id) &&
          (call[1] as RequestInit | undefined)?.method === 'POST',
      )
      expect(validateCall).toBeTruthy()
      expect(JSON.parse(String((validateCall?.[1] as RequestInit).body))).toMatchObject({
        persona_ids: ['persona-alex-morgan'],
        mode: 'chat',
      })
      expect(screen.getByText(/Overall fit/i)).toBeTruthy()
      expect(screen.getByText(/“This phase feels clear.”/)).toBeTruthy()
    })
  })

  it('Validate can reopen a report from history', async () => {
    const journey = (await storeJourneyDetail('journey-product-discovery'))!
    const historyItem = {
      id: 'val-report-hist',
      journeyId: journey.id,
      personaId: 'persona-alex-morgan',
      mode: 'automated' as const,
      overallFitScore: 61,
      validatedAt: '2026-07-30T10:00:00.000Z',
      stubbed: true,
    }
    const fetchMock = vi.fn(async (url: string) => {
      const href = String(url)
      if (href.endsWith('/validation-reports')) {
        return { ok: true, json: async () => ({ items: [historyItem], total: 1 }) }
      }
      if (href.includes('/validation-reports/val-report-hist')) {
        return {
          ok: true,
          json: async () => ({
            stubbed: true,
            workflowId: 'validateJourney',
            reportId: 'val-report-hist',
            mode: 'automated',
            overallFitScore: 61,
            validatedAt: historyItem.validatedAt,
            personaId: 'persona-alex-morgan',
            phases: [
              {
                phaseId: 'phase-signal',
                phaseName: 'Signal intake',
                fitScore: 61,
                status: 'warning',
                frictionPoints: [],
                recommendations: ['Add a decision moment'],
              },
            ],
          }),
        }
      }
      if (href.includes('/api/target-groups/')) {
        return {
          ok: true,
          json: async () => ({
            id: 'tg-digital-product-leads',
            linkedPersonas: [{ id: 'persona-alex-morgan', name: 'Alex Morgan', role: 'Product Lead' }],
          }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ValidateJourneyButton journey={journey} />)
    fireEvent.click(screen.getByRole('button', { name: /^Validate$/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Previous validation report/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText(/Previous validation report/i))
    fireEvent.click(screen.getByRole('option', { name: /automated · fit 61/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiAiJourneyValidationReport(journey.id, 'val-report-hist'),
      )
      expect(screen.getByText(/Overall fit/i)).toBeTruthy()
      expect(screen.getByText(/Add a decision moment/)).toBeTruthy()
    })
  })
})
