import { describe, expect, it } from 'vitest'
import {
  openAiModelAllowsCustomTemperature,
  withOpenAiChatTemperature,
} from '../lib/ai/openai-sampling'

describe('openai-sampling', () => {
  it('omits temperature for gpt-6-luna', () => {
    expect(openAiModelAllowsCustomTemperature('gpt-6-luna')).toBe(false)
    expect(withOpenAiChatTemperature(0.9, 'gpt-6-luna')).toEqual({})
  })

  it('omits temperature for gpt-5 / o-series', () => {
    expect(withOpenAiChatTemperature(0.5, 'gpt-5.4-mini')).toEqual({})
    expect(withOpenAiChatTemperature(0.5, 'o3-mini')).toEqual({})
  })

  it('passes preferred temperature for classic chat models', () => {
    expect(withOpenAiChatTemperature(0.85, 'gpt-4o-mini')).toEqual({ temperature: 0.85 })
    expect(withOpenAiChatTemperature(0.7, 'gpt-test')).toEqual({ temperature: 0.7 })
  })
})
