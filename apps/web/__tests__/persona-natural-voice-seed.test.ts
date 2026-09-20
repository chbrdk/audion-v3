import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_NATURAL_VOICE_OVERLAY,
  resetPersonaPromptsStore,
  storeGetPersonaPromptRecord,
  storeSeedDefaultNaturalVoice,
  storeUpsertPersonaPrompt,
} from '../lib/fixtures/persona-prompts-store'

describe('storeSeedDefaultNaturalVoice', () => {
  beforeEach(() => {
    // Deploy/CI may inject DATABASE_URL; these tests assert the in-memory path.
    vi.stubEnv('DATABASE_URL', '')
    resetPersonaPromptsStore()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('seeds the natural-voice overlay when missing', async () => {
    const seeded = await storeSeedDefaultNaturalVoice('persona-seed-test')
    expect(seeded?.systemPrompt).toBe(DEFAULT_NATURAL_VOICE_OVERLAY)
    const again = await storeGetPersonaPromptRecord('persona-seed-test')
    expect(again?.systemPrompt).toBe(DEFAULT_NATURAL_VOICE_OVERLAY)
  })

  it('does not overwrite an existing custom voice', async () => {
    await storeUpsertPersonaPrompt('persona-seed-test', {
      systemPrompt: 'Dry Berlin humour only.',
    })
    const seeded = await storeSeedDefaultNaturalVoice('persona-seed-test')
    expect(seeded?.systemPrompt).toBe('Dry Berlin humour only.')
  })
})
