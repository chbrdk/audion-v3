import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    process.env.OPENROUTER_API_BASE_URL = 'https://openrouter.test'
    process.env.AI_OPENAI_MODEL = 'gpt-mid-test'
    delete process.env.AI_OPENAI_MODEL_CHAT_LOW
    delete process.env.AI_OPENAI_MODEL_CHAT_HIGH
    delete process.env.JEV_SHADOW_ENABLED
    delete process.env.JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER
  })
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER
    delete process.env.JEV_SHADOW_ENABLED
    delete process.env.AI_OPENAI_MODEL_CHAT_LOW
    delete process.env.AI_OPENAI_MODEL_CHAT_HIGH
  })

  it('keeps default mid model when Act off (shadow schedule only)', async () => {
    process.env.JEV_SHADOW_ENABLED = '1'
    const r = await resolvePersonaChatModel('Hallo!')
    expect(r.tier).toBe('low')
    // OPENROUTER_API_KEY set for Jev → chat transport normalizes bare gpt-* 
    expect(r.model).toBe('openai/gpt-mid-test')
    expect(r.source).toBe('default')
    expect(r.applied).toBe(false)
  })

  it('applies Jev tier under Act', async () => {
    process.env.JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER = '1'
    process.env.AI_OPENAI_MODEL_CHAT_HIGH = 'gpt-high-test'
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          answers: { tier: { type: 'choice', key: 'high' } },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const r = await resolvePersonaChatModel('irgendwas', { fetchImpl })
    expect(r.tier).toBe('high')
    expect(r.model).toBe('openai/gpt-high-test')
    expect(r.source).toBe('jev-act')
    expect(r.applied).toBe(true)
    expect(fetchImpl).toHaveBeenCalled()
  })

  it('fail-open keeps heuristic on upstream error', async () => {
    process.env.JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER = '1'
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    const r = await resolvePersonaChatModel('Hey!', { fetchImpl })
    expect(r.tier).toBe('low')
    expect(r.model).toBe('openai/gpt-mid-test') // low env unset → mid fallback, OR-normalized
    expect(r.source).toBe('heuristic')
  })

  it('env suffix matches catalog id', () => {
    expect(useCaseEnvSuffix(JEV_USE_CASES.audionPersonaChatModelTier)).toBe(
      'AUDION_PERSONA_CHAT_MODEL_TIER',
    )
  })
})
