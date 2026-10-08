import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  BehavioralGoldObservation,
  BehavioralPolicyScoreboard,
} from '@audion-v3/contracts'
import { BehavioralScoreboardPanel } from '../components/behavioral-scoreboard-panel'
import { paths } from '../lib/paths'

const fetchMock = vi.fn()

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const board: BehavioralPolicyScoreboard = {
  policyId: 'pol-ui',
  n: 1,
  syntheticCount: 1,
  humanGoldCount: 0,
  surfaces: { chat: 1 },
  means: {
    frustrationLoad: 0.2,
    fatigue: 0.1,
    clarity: 2,
    timePressure: 0.5,
    verbosity: 0.5,
  },
  stanceHistogram: { proceed: 1 },
  closer: false,
  score: 0.4,
  checks: [{ id: 'sample_size', label: 'n', pass: false, weight: 1, detail: 'n=1' }],
  verdict: 'need more samples',
}

const obs: BehavioralGoldObservation = {
  id: 'obs-1',
  policyId: 'pol-ui',
  schemaVersion: '2026-10-behavioral-v1',
  surface: 'chat',
  personaId: 'persona-alex-morgan',
  conversationId: 'c1',
  recordedAt: '2026-10-08T00:00:00.000Z',
  label: 'synthetic',
  metrics: {
    frustrationLoad: 0.2,
    fatigue: 0.1,
    clarity: 2,
    stance: 'proceed',
    turnIndex: 1,
    timePressure: 0.5,
    verbosity: 0.5,
    stressSensitivity: 0.4,
  },
}

describe('BehavioralScoreboardPanel', () => {
  it('marks a synthetic observation as human gold via PATCH', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'PATCH') {
        expect(url).toContain(paths.routes.apiBehavioralScoreboard)
        const body = JSON.parse(String(init.body)) as { id: string; label: string }
        expect(body).toEqual({ id: 'obs-1', label: 'human_gold' })
        return {
          ok: true,
          json: async () => ({
            observation: { ...obs, label: 'human_gold' },
            scoreboard: { ...board, humanGoldCount: 1, syntheticCount: 0 },
          }),
        }
      }
      return {
        ok: true,
        json: async () => ({ scoreboard: board, observations: [obs] }),
      }
    })

    render(
      <BehavioralScoreboardPanel scoreboards={[board]} initialObservations={[obs]} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Show observations/i }))
    await waitFor(() => expect(screen.getByText(/persona-alex-morgan/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Mark as human gold/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Revert to synthetic/i })).toBeInTheDocument(),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      paths.routes.apiBehavioralScoreboard,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
