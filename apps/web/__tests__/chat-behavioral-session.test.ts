import { afterEach, describe, expect, it } from 'vitest'
import {
  applyChatTurnBehavioralTick,
  BEHAVIORAL_LIVE_SESSION_HEADING,
  buildChatLiveSessionEnvelope,
  estimateChatTurnStress,
  getChatBehavioralSession,
  getOrInitChatBehavioralSession,
  resetChatBehavioralSessions,
  resolveChatMaxTokensWithSession,
  saveChatBehavioralSession,
} from '../lib/behavior/chat-session'
import { compileBehavioralPolicy } from '../lib/behavior/compile-behavioral-policy'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { paths } from '../lib/paths'

afterEach(() => {
  resetChatBehavioralSessions()
  delete process.env[paths.envAiChatMaxTokens]
})

function impatientPolicy() {
  const persona = structuredClone(DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!)
  persona.journeyBehavior = {
    ...persona.journeyBehavior,
    dimensionOverrides: {
      ...(persona.journeyBehavior?.dimensionOverrides ?? {}),
      timePressure: 0.9,
    },
  }
  persona.stressTriggers = ['Cookie walls', 'Buzzword-heavy pages']
  persona.frustrations = [{ label: 'Scattered research notes', evidenceCount: 1 }]
  return compileBehavioralPolicy({ persona })
}

describe('chat behavioral session FSM', () => {
  it('raises stress when the user hits persona soft spots', () => {
    const policy = impatientPolicy()
    const stress = estimateChatTurnStress(
      policy,
      'Why is this another buzzword-heavy page with cookie walls again?',
    )
    expect(stress).toBeGreaterThanOrEqual(0.4)
  })

  it('ticks frustration across turns and shrinks token budget', () => {
    const policy = impatientPolicy()
    let state = getOrInitChatBehavioralSession('conv-1', policy)
    expect(state.stance).toBe('proceed')

    state = applyChatTurnBehavioralTick(
      policy,
      state,
      'This cookie wall and buzzword-heavy deck is exactly what frustrates me.',
    )
    saveChatBehavioralSession('conv-1', state)
    expect(state.frustrationLoad).toBeGreaterThan(0)
    expect(state.turnIndex).toBe(1)

    state = applyChatTurnBehavioralTick(
      policy,
      state,
      'Still more scattered research notes and cookie walls — prove it works.',
    )
    expect(state.frustrationLoad).toBeGreaterThan(0.3)
    saveChatBehavioralSession('conv-1', state)
    expect(getChatBehavioralSession('conv-1')?.frustrationLoad).toBe(state.frustrationLoad)

    const tokensCalm = resolveChatMaxTokensWithSession(
      policy,
      getOrInitChatBehavioralSession('conv-calm', policy),
    )
    const tokensHot = resolveChatMaxTokensWithSession(policy, state)
    expect(tokensHot).toBeLessThan(tokensCalm)

    const envelope = buildChatLiveSessionEnvelope(policy, state)
    expect(envelope).toContain(BEHAVIORAL_LIVE_SESSION_HEADING)
    expect(envelope).toMatch(/stance=/)
    expect(envelope).toMatch(/Do not narrate/)
  })

  it('soft-recovers on short greetings', () => {
    const policy = impatientPolicy()
    let state = getOrInitChatBehavioralSession('conv-hi', policy)
    state = {
      ...state,
      frustrationLoad: 0.4,
      fatigue: 0.3,
      stance: 'hesitate',
    }
    state = applyChatTurnBehavioralTick(policy, state, 'hey')
    expect(state.frustrationLoad).toBeLessThan(0.4)
  })
})
