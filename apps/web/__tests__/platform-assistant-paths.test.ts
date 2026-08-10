import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_EMBED_PRODUCT,
  buildPlatformAssistantEmbedUrl,
} from '../lib/platform-assistant-paths'

describe('audion platform assistant paths', () => {
  it('uses audion product id', () => {
    expect(ASSISTANT_EMBED_PRODUCT).toBe('audion')
  })

  it('builds embed url from public env', () => {
    const prev = process.env.NEXT_PUBLIC_PLEXON_URL
    process.env.NEXT_PUBLIC_PLEXON_URL = 'https://plexon-v3.example'
    expect(buildPlatformAssistantEmbedUrl({})).toBe(
      'https://plexon-v3.example/assistant/embed?product=audion',
    )
    expect(buildPlatformAssistantEmbedUrl({ theme: 'msqdx' })).toBe(
      'https://plexon-v3.example/assistant/embed?product=audion&theme=msqdx',
    )
    process.env.NEXT_PUBLIC_PLEXON_URL = prev
  })
})
