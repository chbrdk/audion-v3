import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiOpenAiImageModel } from '../lib/ai/client'
import { paths } from '../lib/paths'

describe('getAiOpenAiImageModel', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to GPT Image 2.5 Sunburst (persona avatar)', () => {
    vi.stubEnv('AI_OPENAI_IMAGE_MODEL', '')
    expect(paths.aiOpenAiImageModel).toBe('gpt-image-2.5-sunburst')
    expect(getAiOpenAiImageModel()).toBe('gpt-image-2.5-sunburst')
  })

  it('respects AI_OPENAI_IMAGE_MODEL override', () => {
    vi.stubEnv('AI_OPENAI_IMAGE_MODEL', 'gpt-image-2.5-flare')
    expect(getAiOpenAiImageModel()).toBe('gpt-image-2.5-flare')
  })

  it('strips Coolify-style surrounding quotes', () => {
    vi.stubEnv('AI_OPENAI_IMAGE_MODEL', "'gpt-image-2.5-sunburst'")
    expect(getAiOpenAiImageModel()).toBe('gpt-image-2.5-sunburst')
  })
})
