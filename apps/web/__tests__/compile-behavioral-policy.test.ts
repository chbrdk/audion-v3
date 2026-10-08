import { describe, expect, it } from 'vitest'
import type { PersonaDetail, TargetGroupBehavioralPriors } from '@audion-v3/contracts'
import {
  compileBehavioralPolicy,
  consumeTryBudget,
  initBehavioralSessionState,
  policyToJourneyDimensionOverrides,
  tickFrustration,
} from '../lib/behavior/compile-behavioral-policy'

function basePersona(overrides: Partial<PersonaDetail> = {}): PersonaDetail {
  return {
    id: 'persona-test',
    name: 'Test',
    role: 'Buyer',
    status: 'ready',
    avatarUrl: null,
    projectId: null,
    archetype: null,
    updatedAt: null,
    age: null,
    location: null,
    bio: null,
    gender: null,
    attentionSpan: null,
    colorPalette: [],
    mediaAffinity: null,
    confidence: null,
    techLiteracy: null,
    emotionalBaseline: null,
    stressTriggers: [],
    motivations: [],
    traits: {},
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    goals: [],
    frustrations: [],
    channels: [],
    sections: [],
    visuals: null,
    journeyBehavior: null,
    knowledgeEntries: [],
    documents: [],
    profileDe: null,
    headlineDe: null,
    tavusReplicaId: null,
    tavusPersonaId: null,
    tavusLanguage: null,
    videoCallProvider: null,
    beyAvatarId: null,
    beyAgentId: null,
    ...overrides,
  }
}

describe('compileBehavioralPolicy', () => {
  it('raises timePressure and lowers verbosity for impatient traits', () => {
    const impatient = compileBehavioralPolicy({
      persona: basePersona({
        traits: { Impatient: 0.95, Decisive: 0.9 },
      }),
      now: () => new Date('2026-10-07T12:00:00.000Z'),
    })
    const patient = compileBehavioralPolicy({
      persona: basePersona({
        id: 'persona-patient',
        traits: { Thorough: 0.9, Patient: 0.85, DetailOriented: 0.88 },
        journeyBehavior: {
          dimensionOverrides: { timePressure: 0.2, detailOrientation: 0.9 },
        },
      }),
      now: () => new Date('2026-10-07T12:00:00.000Z'),
    })

    expect(impatient.dimensions.timePressure).toBeGreaterThanOrEqual(0.85)
    expect(impatient.citations.timePressure?.source).toBe('trait')
    expect(impatient.budgets.dwellSeconds.max).toBeLessThanOrEqual(2)
    expect(impatient.budgets.tryBeforeAbandon).toBeLessThanOrEqual(
      patient.budgets.tryBeforeAbandon,
    )
    expect(impatient.dimensions.verbosity).toBeLessThan(patient.dimensions.verbosity)
    expect(patient.citations.timePressure?.source).toBe('override')
    expect(patient.dimensions.timePressure).toBe(0.2)
  })

  it('lets explicit dimensionOverrides beat traits', () => {
    const policy = compileBehavioralPolicy({
      persona: basePersona({
        traits: { Impatient: 0.99 },
        journeyBehavior: { dimensionOverrides: { timePressure: 0.1 } },
      }),
    })
    expect(policy.dimensions.timePressure).toBe(0.1)
    expect(policy.citations.timePressure?.source).toBe('override')
  })

  it('uses techLiteracy scalar and skepticism from communicationStyle', () => {
    const policy = compileBehavioralPolicy({
      persona: basePersona({
        techLiteracy: 0.22,
        communicationStyle: {
          vocabulary: ['klar'],
          sentenceStructure: 'short',
          skepticismLevel: 0.91,
        },
      }),
    })
    expect(policy.dimensions.techLiteracy).toBe(0.22)
    expect(policy.citations.techLiteracy?.source).toBe('scalar')
    expect(policy.dimensions.trustSkepticism).toBe(0.91)
    expect(policy.citations.trustSkepticism?.source).toBe('scalar')
    expect(policy.qualitative.vocabulary).toContain('klar')
  })

  it('blends TG priors only when persona knob is default', () => {
    const tg: TargetGroupBehavioralPriors = {
      blendWeight: 0.5,
      dimensions: { timePressure: 0.9, exploration: 0.1 },
    }
    const defaultPersona = compileBehavioralPolicy({
      persona: basePersona({ id: 'p-default' }),
      targetGroupId: 'tg-1',
      tgPriors: tg,
    })
    expect(defaultPersona.citations.timePressure?.source).toBe('tg_prior')
    expect(defaultPersona.dimensions.timePressure).toBeGreaterThan(0.6)

    const overridden = compileBehavioralPolicy({
      persona: basePersona({
        id: 'p-ov',
        journeyBehavior: { dimensionOverrides: { timePressure: 0.2 } },
      }),
      targetGroupId: 'tg-1',
      tgPriors: tg,
    })
    expect(overridden.dimensions.timePressure).toBe(0.2)
    expect(overridden.citations.timePressure?.source).toBe('override')
  })

  it('maps journey snake_case overrides from policy', () => {
    const policy = compileBehavioralPolicy({
      persona: basePersona({
        journeyBehavior: { dimensionOverrides: { timePressure: 0.8, exploration: 0.3 } },
      }),
    })
    expect(policyToJourneyDimensionOverrides(policy)).toMatchObject({
      time_pressure: 0.8,
      exploration: 0.3,
    })
  })

  it('is deterministic for same inputs', () => {
    const input = {
      persona: basePersona({ traits: { Curious: 0.7 } }),
      now: () => new Date('2026-10-07T12:00:00.000Z'),
    }
    const a = compileBehavioralPolicy(input)
    const b = compileBehavioralPolicy(input)
    expect(a.policyId).toBe(b.policyId)
    expect(a.dimensions).toEqual(b.dimensions)
  })
})

describe('BehavioralSessionState', () => {
  it('initializes try budget from policy and ticks frustration toward hesitate', () => {
    const policy = compileBehavioralPolicy({
      persona: basePersona({
        traits: { Impatient: 0.9, Anxious: 0.8 },
        stressTriggers: ['Wartezeiten', 'Unklare Filter'],
        frustrations: [{ label: 'Graue Buttons', evidenceCount: 1 }],
      }),
    })
    let state = initBehavioralSessionState(policy, 'browse')
    expect(state.tryBudgetRemaining).toBe(policy.budgets.tryBeforeAbandon)
    expect(state.stance).toBe('hesitate')

    state = tickFrustration(policy, state, 1)
    expect(state.frustrationLoad).toBeGreaterThan(0)
    expect(state.fatigue).toBeGreaterThan(0)

    state = consumeTryBudget(policy, state, 'nav-outdoor')
    expect(state.tryBudgetRemaining).toBe(policy.budgets.tryBeforeAbandon - 1)
    expect(state.episodic.some((e) => e.key === 'nav-outdoor')).toBe(true)
  })
})
