import { describe, expect, it } from 'vitest'
import type { PersonaDetail } from '@audion-v3/contracts'
import {
  ADAPTIVE_CHAT_RULES_HEADING,
  ADAPTIVE_CUSTOM_VOICE_HEADING,
  buildAdaptivePersonaChatSystemPrompt,
  previewAdaptivePromptWithVoice,
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
    expect(prompt).toMatch(/80–120 words/)
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
    if (prev !== undefined) process.env[paths.envAiChatMaxTokens] = prev
  })
})
