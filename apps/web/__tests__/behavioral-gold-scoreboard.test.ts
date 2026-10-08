import { afterEach, describe, expect, it } from 'vitest'
import {
  aggregatePolicyScoreboard,
  DEFAULT_BEHAVIORAL_GOLD_BAND,
  observationFromSession,
} from '../lib/behavior/gold-scoreboard'
import {
  listBehavioralGoldObservations,
  listBehavioralPolicyScoreboards,
  recordBehavioralGoldObservation,
  resetBehavioralGoldStore,
} from '../lib/behavior/gold-store'
import {
  compileBehavioralPolicy,
  initBehavioralSessionState,
} from '../lib/behavior/compile-behavioral-policy'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { paths } from '../lib/paths'

afterEach(() => {
  resetBehavioralGoldStore()
})

function samplePolicy() {
  const persona = structuredClone(DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!)
  persona.journeyBehavior = {
    ...persona.journeyBehavior,
    dimensionOverrides: {
      ...(persona.journeyBehavior?.dimensionOverrides ?? {}),
      timePressure: 0.55,
    },
  }
  return compileBehavioralPolicy({ persona })
}

describe('behavioral gold scoreboard', () => {
  it('aggregates observations and requires n≥3 for closer', () => {
    const policy = samplePolicy()
    const state = initBehavioralSessionState(policy, 'chat')
    state.frustrationLoad = 0.3
    state.fatigue = 0.2
    state.stance = 'proceed'

    const rows = []
    for (let i = 0; i < 3; i++) {
      const obs = observationFromSession({
        policy,
        state: { ...state, turnIndex: i + 1 },
        personaId: policy.personaId,
        conversationId: `c-${i}`,
      })
      recordBehavioralGoldObservation(obs)
      rows.push(obs)
    }

    const board = aggregatePolicyScoreboard(policy.policyId, rows)
    expect(board.n).toBe(3)
    expect(board.means.frustrationLoad).toBeCloseTo(0.3, 1)
    expect(board.closer).toBe(true)
    expect(board.score).toBeGreaterThanOrEqual(DEFAULT_BEHAVIORAL_GOLD_BAND.closerScoreThreshold)
    expect(board.checks.some((c) => c.id === 'sample_size' && c.pass)).toBe(true)

    const listed = listBehavioralPolicyScoreboards()
    expect(listed[0]?.policyId).toBe(policy.policyId)
    expect(listBehavioralGoldObservations(policy.policyId)).toHaveLength(3)
  })

  it('marks not closer when n is below policy min', () => {
    const policy = samplePolicy()
    const state = initBehavioralSessionState(policy, 'chat')
    state.frustrationLoad = 0.3
    state.fatigue = 0.2
    const obs = observationFromSession({
      policy,
      state,
      personaId: policy.personaId,
    })
    recordBehavioralGoldObservation(obs)
    const board = aggregatePolicyScoreboard(policy.policyId, [obs])
    expect(board.n).toBe(1)
    expect(board.closer).toBe(false)
    expect(board.checks.find((c) => c.id === 'sample_size')?.pass).toBe(false)
  })

  it('registers studies behavioral routes in paths', () => {
    expect(paths.routes.studiesBehavioral).toBe('/studies/behavioral')
    expect(paths.routes.apiBehavioralScoreboard).toBe('/api/behavioral/scoreboard')
  })
})
