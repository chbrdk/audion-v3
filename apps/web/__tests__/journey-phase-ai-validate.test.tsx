import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeneratePhaseMomentsButton } from '../components/generate-phase-moments-button'
import { ValidateJourneyButton } from '../components/validate-journey-button'
import { storeJourneyDetail } from '../lib/fixtures/journey-store'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('journey phase AI + validate UI', () => {
  it('Generate moments posts to phase generate route', async () => {
    const journey = storeJourneyDetail('journey-product-discovery')!
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
    const journey = storeJourneyDetail('journey-product-discovery')!
    const fetchMock = vi.fn(async (url: string) => {
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
      return {
        ok: true,
        json: async () => ({
          stubbed: true,
          workflowId: 'validateJourney',
          overallFitScore: 72,
          validatedAt: new Date().toISOString(),
          personaId: 'persona-alex-morgan',
          phases: [
            {
              phaseId: 'phase-signal',
              phaseName: 'Signal intake',
              fitScore: 72,
              status: 'good',
              frictionPoints: [],
              recommendations: [],
            },
          ],
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ValidateJourneyButton journey={journey} />)
    fireEvent.click(screen.getByRole('button', { name: /^Validate$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Rule-based fit/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Run validation/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiAiValidateJourney(journey.id),
        expect.objectContaining({ method: 'POST' }),
      )
      expect(screen.getByText(/Overall fit/i)).toBeTruthy()
    })
  })
})
