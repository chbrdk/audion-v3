import { describe, expect, it } from 'vitest'
import type { PersonaDetail } from '@audion-v3/contracts'
import {
  compileBehavioralPolicy,
  initBehavioralSessionState,
} from '../lib/behavior/compile-behavioral-policy'
import { applyChatTurnBehavioralTick } from '../lib/behavior/chat-session'
import {
  buildChatReplyRationale,
  listChatStressHits,
} from '../lib/behavior/reply-rationale'

function basePersona(overrides: Partial<PersonaDetail> = {}): PersonaDetail {
  return {
    id: 'persona-rationale-test',
    slug: 'persona-rationale-test',
    name: 'Rationale Test',
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
    stressTriggers: ['cookie wall', 'prove it'],
    motivations: [],
    traits: { Impatience: 0.9, Warmth: 0.2 },
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    goals: [{ label: 'Ship fast', priority: 1 }],
    frustrations: [{ label: 'Cookie walls', evidenceCount: 1 }],
    channels: [],
    sections: [],
    visuals: null,
    journeyBehavior: {
      dimensionOverrides: {
        timePressure: 0.92,
        trustSkepticism: 0.8,
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

describe('buildChatReplyRationale', () => {
  it('surfaces impatient lane and cited extreme drivers', () => {
    const persona = basePersona()
    const policy = compileBehavioralPolicy({ persona })
    const session = initBehavioralSessionState(policy, 'chat')
    const rationale = buildChatReplyRationale({
      policy,
      session,
      traits: persona.traits,
      userMessage: 'hi',
    })
    expect(rationale.lane).toBe('impatient')
    expect(rationale.policyId).toBe(policy.policyId)
    expect(rationale.summary.toLowerCase()).toMatch(/impatient/)
    expect(rationale.drivers.length).toBeGreaterThan(0)
    expect(rationale.drivers.some((d) => d.key === 'timePressure')).toBe(true)
    const time = rationale.drivers.find((d) => d.key === 'timePressure')
    expect(time?.source).toBe('override')
    expect(time?.direction).toBe('up')
  })

  it('lists stress hits from the user turn and raises frustration', () => {
    const persona = basePersona()
    const policy = compileBehavioralPolicy({ persona })
    let session = initBehavioralSessionState(policy, 'chat')
    const message = 'Another cookie wall — prove it.'
    expect(listChatStressHits(policy, message).length).toBeGreaterThan(0)
    session = applyChatTurnBehavioralTick(policy, session, message)
    const rationale = buildChatReplyRationale({
      policy,
      session,
      traits: persona.traits,
      userMessage: message,
    })
    expect(rationale.stressHits?.length).toBeGreaterThan(0)
    expect(rationale.frustrationLoad).toBeGreaterThan(0)
    expect(rationale.summary).toMatch(/hit:/i)
  })
})
