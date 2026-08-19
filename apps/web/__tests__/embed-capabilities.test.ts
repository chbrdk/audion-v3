import { describe, expect, it } from 'vitest'
import { parseChatEmbedCapabilities } from '../lib/chat/embed-capabilities'

describe('parseChatEmbedCapabilities', () => {
  it('treats embed=full as full persona chat', () => {
    expect(parseChatEmbedCapabilities('full')).toBe('full')
    expect(parseChatEmbedCapabilities('FULL')).toBe('full')
  })

  it('defaults guest for embed=1 and missing', () => {
    expect(parseChatEmbedCapabilities('1')).toBe('guest')
    expect(parseChatEmbedCapabilities(undefined)).toBe('guest')
  })
})
