import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  normalizeChatModelId,
  resolveChatCompletionTransport,
} from '@/lib/ai/client'

describe('chat completion transport', () => {
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_BASE_URL
  })

  it('prefers openrouter when OR key is set', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    process.env.OPENAI_API_KEY = 'sk-proj-test'
    expect(resolveChatCompletionTransport()).toBe('openrouter')
  })

  it('falls back to openai without OR key', () => {
    delete process.env.OPENROUTER_API_KEY
    process.env.OPENAI_API_KEY = 'sk-proj-test'
    expect(resolveChatCompletionTransport()).toBe('openai')
  })

  it('prefixes bare gpt ids on openrouter', () => {
    expect(normalizeChatModelId('gpt-6-astra', 'openrouter')).toBe('openai/gpt-6-astra')
    expect(normalizeChatModelId('qwen/qwen3-max', 'openrouter')).toBe('qwen/qwen3-max')
    expect(normalizeChatModelId('gpt-6-luna', 'openai')).toBe('gpt-6-luna')
  })
})
