import { describe, expect, it } from 'vitest'
import type { PersonaDetail } from '@audion-v3/contracts'
import {
  ADAPTIVE_CHAT_RULES_HEADING,
  ADAPTIVE_CUSTOM_VOICE_HEADING,
  RESEARCH_ELICITATION_HEADING,
  buildAdaptivePersonaChatSystemPrompt,
  isResearchElicitationMessage,
  previewAdaptivePromptWithVoice,
  withResearchElicitationEnvelope,
} from '../lib/chat/adaptive-persona-chat-prompt'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { getChatCompletionMaxTokens } from '../lib/ai/client'
import { paths } from '../lib/paths'

function clonePersona(id: string): PersonaDetail {
  const base = DEMO_PERSONAS.find((p) => p.id === id)
  if (!base) throw new Error(`missing fixture ${id}`)
  return structuredClone(base)
}

describe('buildAdaptivePersonaChatSystemPrompt', () => {
  it('includes traits, style, goals, frustrations, and chat rules', () => {
    const persona = clonePersona('persona-alex-morgan')
    const prompt = buildAdaptivePersonaChatSystemPrompt(persona)

    expect(prompt).toContain('You ARE Alex Morgan')
    expect(prompt).toContain('Analytical: 0.82')
    expect(prompt).toContain('Personality traits')
    expect(prompt).toContain('How you talk')
    expect(prompt).toContain('decision loop')
    expect(prompt).toContain('## Goals')
    expect(prompt).toMatch(/Ship clearer persona workflows/i)
    expect(prompt).toContain('## Frustrations')
    expect(prompt).toMatch(/Scattered research notes/i)
    expect(prompt).toContain('Mindset')
    expect(prompt).toContain(ADAPTIVE_CHAT_RULES_HEADING)
    expect(prompt).toMatch(/40–90 words/)
    expect(prompt).toMatch(/natural conversation/i)
    expect(prompt).toMatch(/Anti-method/i)
    expect(prompt).toMatch(/Anti-coach/i)
    expect(prompt).toMatch(/No ### headings/i)
  })

  it('maps high impatience traits to lead-with-answer surface form', () => {
    const persona = clonePersona('persona-alex-morgan')
    persona.traits = { Impatience: 0.9, Analytical: 0.5 }
    const prompt = buildAdaptivePersonaChatSystemPrompt(persona)
    expect(prompt).toMatch(/lead with the answer/i)
    expect(prompt).toMatch(/avoid lists/i)
  })

  it('appends custom voice without dropping the adaptive profile', () => {
    const persona = clonePersona('persona-alex-morgan')
    const prompt = buildAdaptivePersonaChatSystemPrompt(persona, {
      customVoice: 'Speak with dry Berlin humour.',
    })

    expect(prompt).toContain('Analytical: 0.82')
    expect(prompt).toContain(ADAPTIVE_CUSTOM_VOICE_HEADING)
    expect(prompt).toContain('Speak with dry Berlin humour.')
    const voiceIdx = prompt.indexOf(ADAPTIVE_CUSTOM_VOICE_HEADING)
    const rulesIdx = prompt.indexOf(ADAPTIVE_CHAT_RULES_HEADING)
    expect(voiceIdx).toBeGreaterThan(-1)
    expect(rulesIdx).toBeGreaterThan(voiceIdx)
  })

  it('caps long lists and knowledge content', () => {
    const persona = clonePersona('persona-alex-morgan')
    persona.goals = Array.from({ length: 20 }, (_, i) => ({
      label: `Goal number ${i} with some padding text`,
      priority: i,
    }))
    persona.knowledgeEntries = Array.from({ length: 8 }, (_, i) => ({
      id: `k-${i}`,
      title: `Knowledge ${i}`,
      content: 'x'.repeat(800),
      updatedAt: null,
    }))

    const prompt = buildAdaptivePersonaChatSystemPrompt(persona)
    expect(prompt.match(/- Goal number/g)?.length).toBe(8)
    expect(prompt.match(/- Knowledge \d:/g)?.length).toBe(4)
    expect(prompt).not.toContain('x'.repeat(500))
    expect(prompt).toMatch(/quiet background/i)
  })

  it('differs across personas with distinct traits/style', () => {
    const alex = buildAdaptivePersonaChatSystemPrompt(clonePersona('persona-alex-morgan'))
    const other = DEMO_PERSONAS.find(
      (p) => p.id !== 'persona-alex-morgan' && Object.keys(p.traits).length > 0,
    )
    expect(other).toBeTruthy()
    const b = buildAdaptivePersonaChatSystemPrompt(clonePersona(other!.id))
    expect(alex).not.toBe(b)
    expect(alex).toContain('Alex Morgan')
    expect(b).toContain(other!.name)
  })
})

describe('research elicitation envelope', () => {
  const geoBrief =
    'Hi Michael, ich möchte dass du mir 3 fragen aus je 3 kategorien gibts. U = Unbranded/kategorial BV = Branded/vergleichend BR = Branded/Reputationscheck Fehlinformationsrisiko'

  it('detects GEO / U-BV-BR methodology dumps', () => {
    expect(isResearchElicitationMessage(geoBrief)).toBe(true)
    expect(isResearchElicitationMessage('hey wie geht es euch?')).toBe(false)
    expect(isResearchElicitationMessage('Was denkst du über Wärmepumpen?')).toBe(false)
  })

  it('appends envelope only for elicitation messages without dropping base prompt', () => {
    const base = buildAdaptivePersonaChatSystemPrompt(clonePersona('persona-alex-morgan'))
    const withEnvelope = withResearchElicitationEnvelope(base, geoBrief)
    expect(withEnvelope).toContain('You ARE Alex Morgan')
    expect(withEnvelope).toContain(ADAPTIVE_CHAT_RULES_HEADING)
    expect(withEnvelope).toContain(RESEARCH_ELICITATION_HEADING)
    expect(withEnvelope).toMatch(/Natural dialogue rules still win/i)
    expect(withEnvelope).toMatch(/no category names/i)
    expect(withResearchElicitationEnvelope(base, 'Kurze Meinung zu Heizen?')).toBe(base)
  })
})

describe('previewAdaptivePromptWithVoice', () => {
  it('inserts voice before chat rules', () => {
    const adaptive = buildAdaptivePersonaChatSystemPrompt(clonePersona('persona-alex-morgan'))
    const preview = previewAdaptivePromptWithVoice(adaptive, 'Keep answers punchy.')
    expect(preview).toContain('Keep answers punchy.')
    expect(preview.indexOf(ADAPTIVE_CUSTOM_VOICE_HEADING)).toBeLessThan(
      preview.indexOf(ADAPTIVE_CHAT_RULES_HEADING),
    )
  })
})

describe('getChatCompletionMaxTokens', () => {
  it('defaults to paths.chatCompletionMaxTokens', () => {
    const prev = process.env[paths.envAiChatMaxTokens]
    delete process.env[paths.envAiChatMaxTokens]
    expect(getChatCompletionMaxTokens()).toBe(paths.chatCompletionMaxTokens)
    expect(getChatCompletionMaxTokens({ elicitation: true })).toBe(paths.chatElicitationMaxTokens)
    if (prev !== undefined) process.env[paths.envAiChatMaxTokens] = prev
  })
})
