import { describe, expect, it } from 'vitest'
import {
  BEHAVIORAL_CHAT_ENVELOPE_HEADING,
  buildChatBehavioralEnvelope,
  resolvePersonaChatMaxTokens,
  voiceLaneFromPolicy,
} from '../lib/behavior/chat-adapter'
import { compileBehavioralPolicy } from '../lib/behavior/compile-behavioral-policy'
import {
  BEHAVIORAL_VIDEO_RULES_HEADING,
  buildVideoBehavioralRules,
  videoConversationalContextHint,
} from '../lib/behavior/video-adapter'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { paths } from '../lib/paths'
import {
  buildTavusPalSystemPrompt,
  tavusSessionConversationalContextForPersona,
} from '../lib/tavus/prompt'

function personaWithDims(dims: {
  timePressure?: number
  detailOrientation?: number
  trustSkepticism?: number
  warmth?: number
}) {
  const base = structuredClone(DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!)
  base.journeyBehavior = {
    ...base.journeyBehavior,
    dimensionOverrides: {
      ...(base.journeyBehavior?.dimensionOverrides ?? {}),
      ...dims,
    },
  }
  return base
}

describe('chat + video behavioral adapters', () => {
  it('maps impatient policy to impatient lane and shorter chat envelope', () => {
    const policy = compileBehavioralPolicy({
      persona: personaWithDims({ timePressure: 0.95, detailOrientation: 0.25 }),
    })
    expect(voiceLaneFromPolicy(policy)).toBe('impatient')
    const envelope = buildChatBehavioralEnvelope(policy)
    expect(envelope).toContain(BEHAVIORAL_CHAT_ENVELOPE_HEADING)
    expect(envelope).toMatch(/timePressure 0\.95/)
    expect(resolvePersonaChatMaxTokens(policy)).toBeLessThanOrEqual(280)
  })

  it('maps warm+skeptical dims into video rules and context hints', () => {
    const policy = compileBehavioralPolicy({
      persona: personaWithDims({
        timePressure: 0.3,
        trustSkepticism: 0.85,
        warmth: 0.8,
      }),
    })
    const rules = buildVideoBehavioralRules(policy)
    expect(rules).toContain(BEHAVIORAL_VIDEO_RULES_HEADING)
    expect(rules).toMatch(/warmth|skeptic|thinking pauses|clarifying/i)
    expect(videoConversationalContextHint(policy)).toMatch(/skeptical|patient/i)
  })

  it('injects compiled spoken rules into Tavus PAL for full personas', () => {
    const alex = personaWithDims({ timePressure: 0.92, trustSkepticism: 0.8 })
    const prompt = buildTavusPalSystemPrompt(alex)
    expect(prompt).toContain(BEHAVIORAL_VIDEO_RULES_HEADING)
    expect(prompt).toMatch(/Speak briefly|Voice lane: impatient/i)
    expect(tavusSessionConversationalContextForPersona(alex)).toMatch(
      /time-pressed|short answers/i,
    )
  })

  it('honors AI_CHAT_MAX_TOKENS env ceiling over policy', () => {
    const prev = process.env[paths.envAiChatMaxTokens]
    process.env[paths.envAiChatMaxTokens] = '150'
    const policy = compileBehavioralPolicy({ persona: personaWithDims({ timePressure: 0.1 }) })
    expect(resolvePersonaChatMaxTokens(policy)).toBe(150)
    if (prev !== undefined) process.env[paths.envAiChatMaxTokens] = prev
    else delete process.env[paths.envAiChatMaxTokens]
  })
})
