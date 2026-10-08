import { describe, expect, it } from 'vitest'
import type { PersonaDetail } from '@audion-v3/contracts'
import {
  compileBehavioralPolicy,
  initBehavioralSessionState,
} from '../lib/behavior/compile-behavioral-policy'
import {
  buildChatDynamicsPlan,
  resolveChatDynamicsMode,
  resolveChatReplyDelayMs,
  withChatDynamicsEnvelope,
} from '../lib/behavior/chat-dynamics'
import { buildChatLiveSessionEnvelope } from '../lib/behavior/chat-session'

function basePersona(overrides: Partial<PersonaDetail> = {}): PersonaDetail {
  return {
    id: 'persona-dynamics-test',
    slug: 'persona-dynamics-test',
    name: 'Dynamics Test',
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
    traits: { Impatience: 0.2 },
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    goals: [],
    frustrations: [],
    channels: [],
    sections: [],
    visuals: null,
    journeyBehavior: {
      dimensionOverrides: {
        timePressure: 0.3,
        trustSkepticism: 0.5,
      },
      dos: [],
      donts: [],
      heuristics: [],
    },
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

describe('chat dynamics', () => {
  it('picks repair when clarity is low', () => {
    const policy = compileBehavioralPolicy({ persona: basePersona() })
    const session = {
      ...initBehavioralSessionState(policy, 'chat'),
      clarity: 0,
      stance: 'proceed' as const,
    }
    expect(resolveChatDynamicsMode(policy, session, 'ok')).toBe('repair')
  })

  it('picks non_answer when abandon + high time pressure', () => {
    const policy = compileBehavioralPolicy({
      persona: basePersona({
        journeyBehavior: {
          dimensionOverrides: { timePressure: 0.95 },
          dos: [],
          donts: [],
          heuristics: [],
        },
      }),
    })
    const session = {
      ...initBehavioralSessionState(policy, 'chat'),
      stance: 'abandon' as const,
      frustrationLoad: 0.9,
    }
    expect(resolveChatDynamicsMode(policy, session)).toBe('non_answer')
  })

  it('patient personas delay longer than impatient ones', () => {
    const patient = compileBehavioralPolicy({
      persona: basePersona({
        journeyBehavior: {
          dimensionOverrides: { timePressure: 0.15 },
          dos: [],
          donts: [],
          heuristics: [],
        },
      }),
    })
    const impatient = compileBehavioralPolicy({
      persona: basePersona({
        id: 'persona-fast',
        slug: 'persona-fast',
        journeyBehavior: {
          dimensionOverrides: { timePressure: 0.95 },
          dos: [],
          donts: [],
          heuristics: [],
        },
      }),
    })
    const sPatient = initBehavioralSessionState(patient, 'chat')
    const sFast = initBehavioralSessionState(impatient, 'chat')
    expect(resolveChatReplyDelayMs(patient, sPatient)).toBeGreaterThan(
      resolveChatReplyDelayMs(impatient, sFast),
    )
  })

  it('appends dynamics block to the live envelope', () => {
    const policy = compileBehavioralPolicy({ persona: basePersona() })
    const session = {
      ...initBehavioralSessionState(policy, 'chat'),
      clarity: 0,
    }
    const plan = buildChatDynamicsPlan(policy, session, 'huh?')
    expect(plan.mode).toBe('repair')
    const live = withChatDynamicsEnvelope(
      buildChatLiveSessionEnvelope(policy, session),
      plan,
    )
    expect(live).toMatch(/## Dialogue dynamics/)
    expect(live).toMatch(/mode=repair/)
    expect(live).toMatch(/clarifying question/i)
  })
})
