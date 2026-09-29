import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  heuristicPersonaChatModelTier,
  modelIdForPersonaChatTier,
  resolvePersonaChatModel,
} from '@/lib/chat/persona-chat-model-tier'
import { JEV_USE_CASES } from '@/lib/jev/catalog'
import { useCaseEnvSuffix } from '@/lib/jev/env'

describe('persona-chat-model-tier heuristic', () => {
  it('maps greeting / elicitation / default', () => {
    expect(heuristicPersonaChatModelTier('Hey, wie geht’s?')).toBe('low')
    expect(heuristicPersonaChatModelTier('How are you doing?')).toBe('low')
    expect(
      heuristicPersonaChatModelTier(
        'Bitte 3 Fragen aus je 3 Kategorien: U= Unbranded / kategorial, BV=, BR= prompt-bank',
      ),
    ).toBe('high')
    expect(heuristicPersonaChatModelTier('Was hältst du von der Wärmepumpe?')).toBe('mid')
  })

  it('maps env allowlist with mid fallback', () => {
    process.env.AI_OPENAI_MODEL = 'gpt-mid-test'
    delete process.env.AI_OPENAI_MODEL_CHAT_LOW
    delete process.env.AI_OPENAI_MODEL_CHAT_HIGH
    delete process.env.OPENROUTER_API_KEY
    expect(modelIdForPersonaChatTier('mid')).toBe('gpt-mid-test')
    expect(modelIdForPersonaChatTier('low')).toBe('gpt-mid-test')
    expect(modelIdForPersonaChatTier('high')).toBe('gpt-mid-test')
    process.env.AI_OPENAI_MODEL_CHAT_LOW = 'gpt-low-test'
    process.env.AI_OPENAI_MODEL_CHAT_HIGH = 'gpt-high-test'
    expect(modelIdForPersonaChatTier('low')).toBe('gpt-low-test')
    expect(modelIdForPersonaChatTier('high')).toBe('gpt-high-test')
  })

  it('normalizes high gpt id when OpenRouter transport is active', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or'
    process.env.AI_OPENAI_MODEL = 'qwen/qwen3-max'
    process.env.AI_OPENAI_MODEL_CHAT_HIGH = 'gpt-6-astra'
    expect(modelIdForPersonaChatTier('high')).toBe('openai/gpt-6-astra')
    expect(modelIdForPersonaChatTier('mid')).toBe('qwen/qwen3-max')
  })
})

describe('resolvePersonaChatModel', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.AI_OPENAI_MODEL = 'gpt-mid-test'
    delete process.env.AI_OPENAI_MODEL_CHAT_LOW
    delete process.env.AI_OPENAI_MODEL_CHAT_HIGH
  })
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.AI_OPENAI_MODEL_CHAT_LOW
    delete process.env.AI_OPENAI_MODEL_CHAT_HIGH
  })

  it('maps greeting to low allowlist without calling Jev', async () => {
    process.env.AI_OPENAI_MODEL_CHAT_LOW = 'gpt-low-test'
    const r = await resolvePersonaChatModel('Hallo!')
    expect(r.tier).toBe('low')
    expect(r.model).toBe('openai/gpt-low-test')
    expect(r.source).toBe('heuristic')
    expect(r.applied).toBe(false)
  })

  it('maps mid dialogue to mid model', async () => {
    const r = await resolvePersonaChatModel('Was hältst du von der Marke?')
    expect(r.tier).toBe('mid')
    expect(r.model).toBe('openai/gpt-mid-test')
    expect(r.source).toBe('heuristic')
  })

  it('maps elicitation to high allowlist', async () => {
    process.env.AI_OPENAI_MODEL_CHAT_HIGH = 'gpt-high-test'
    const r = await resolvePersonaChatModel(
      'Bitte 3 Fragen aus je 3 Kategorien: U= Unbranded / kategorial, BV=, BR= prompt-bank',
    )
    expect(r.tier).toBe('high')
    expect(r.model).toBe('openai/gpt-high-test')
    expect(r.source).toBe('heuristic')
  })

  it('routes image turns to vision allowlist (not text-only mid)', async () => {
    process.env.AI_OPENAI_MODEL = 'qwen/qwen3-max'
    process.env.AI_OPENAI_MODEL_CHAT_VISION = 'openai/gpt-6-astra'
    const r = await resolvePersonaChatModel('Was siehst du?', { hasImages: true })
    expect(r.source).toBe('vision')
    expect(r.model).toBe('openai/gpt-6-astra')
  })

  it('env suffix still matches catalog id for future rewire', () => {
    expect(useCaseEnvSuffix(JEV_USE_CASES.audionPersonaChatModelTier)).toBe(
      'AUDION_PERSONA_CHAT_MODEL_TIER',
    )
  })
})
