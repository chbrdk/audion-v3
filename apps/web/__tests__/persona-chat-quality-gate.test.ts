/**
 * Quality gate: newly created personas inherit the same human chat stack.
 * Spec: specs/domain/persona-chat-eval.md · knowledge/persona-chat-quality-gate.md
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ADAPTIVE_CHAT_RULES_HEADING,
  LANGUAGE_TURN_HEADING,
  VOICE_EXAMPLES_HEADING,
  withTurnEnvelopes,
} from '../lib/chat/adaptive-persona-chat-prompt'
import {
  DEFAULT_NATURAL_VOICE_OVERLAY,
  resolvePersonaSystemPrompt,
  resetPersonaPromptsStore,
  storeGetPersonaPromptRecord,
  storeSeedDefaultNaturalVoice,
} from '../lib/fixtures/persona-prompts-store'
import { resetPersonaStore, storeCreatePersona } from '../lib/fixtures/persona-store'

describe('persona chat quality gate (new personas)', () => {
  beforeEach(() => {
    resetPersonaStore()
    resetPersonaPromptsStore()
  })

  it('seeds natural voice and resolves full adaptive humanize stack', async () => {
    const persona = await storeCreatePersona({
      name: 'Gate Test Persona',
      role: 'Research participant',
      projectId: 'proj-gate-test',
      goals: [{ id: 'g1', label: 'Find a reliable system' }],
      frustrations: [{ id: 'f1', label: 'Marketing without proof' }],
      traits: { Impatience: 0.8, Skepticism: 0.7 },
    })
    await storeSeedDefaultNaturalVoice(persona.id)

    const overlay = await storeGetPersonaPromptRecord(persona.id)
    expect(overlay?.systemPrompt).toBe(DEFAULT_NATURAL_VOICE_OVERLAY)

    const dePrompt = await resolvePersonaSystemPrompt(persona.id, {
      message: 'hey wie geht’s?',
    })
    expect(dePrompt).toContain('You ARE Gate Test Persona')
    expect(dePrompt).toContain(ADAPTIVE_CHAT_RULES_HEADING)
    expect(dePrompt).toContain(VOICE_EXAMPLES_HEADING)
    expect(dePrompt).toMatch(/LANGUAGE \(critical\)/i)
    expect(dePrompt).toMatch(/natural conversation/i)
    expect(dePrompt).toMatch(/Anti-method/i)
    expect(dePrompt).toMatch(/Vary the lived detail/i)
    expect(dePrompt).toContain(DEFAULT_NATURAL_VOICE_OVERLAY.split('.')[0]!)

    const enTurn = withTurnEnvelopes(dePrompt, 'How does the brand stack up against Viessmann?')
    expect(enTurn).toContain(LANGUAGE_TURN_HEADING)
    expect(enTurn).toMatch(/entirely in English/i)

    const enPrompt = await resolvePersonaSystemPrompt(persona.id, {
      message: 'hey how are you?',
    })
    expect(enPrompt).toMatch(/impatient, en|balanced, en|skeptical, en|warm, en/)
    expect(enPrompt).toMatch(/entirely in natural English/i)
  })
})
