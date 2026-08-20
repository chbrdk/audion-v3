import { describe, expect, it } from 'vitest'
import { applyChatEmbedTheme, normalizeChatEmbedTheme } from '../lib/chat/embed-theme'
import {
  isChatEmbedHostThemeMessage,
  isTrustedChatEmbedHostOrigin,
} from '../lib/chat/embed-host-protocol'

describe('normalizeChatEmbedTheme', () => {
  it('accepts Plexon shell theme ids', () => {
    expect(normalizeChatEmbedTheme('msqdx')).toBe('msqdx')
    expect(normalizeChatEmbedTheme('msqdx-dark')).toBe('msqdx-dark')
  })

  it('rejects unknown ids', () => {
    expect(normalizeChatEmbedTheme('custom-theme')).toBeNull()
  })
})

describe('applyChatEmbedTheme', () => {
  it('sets html data-theme when allowlisted', () => {
    const applied = applyChatEmbedTheme('msqdx')
    expect(applied).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('msqdx')
    applyChatEmbedTheme('msqdx-dark')
  })
})

describe('chat embed host protocol', () => {
  it('recognizes assistant:theme host messages', () => {
    expect(
      isChatEmbedHostThemeMessage({
        source: 'plexon-assistant-host',
        type: 'assistant:theme',
        themeId: 'msqdx-dark',
      }),
    ).toBe(true)
  })

  it('allows configured Plexon origins', () => {
    const prev = process.env.NEXT_PUBLIC_PLEXON_URL
    process.env.NEXT_PUBLIC_PLEXON_URL = 'https://plexon-v3.example'
    expect(isTrustedChatEmbedHostOrigin('https://plexon-v3.example')).toBe(true)
    expect(isTrustedChatEmbedHostOrigin('https://evil.example')).toBe(false)
    process.env.NEXT_PUBLIC_PLEXON_URL = prev
  })
})
