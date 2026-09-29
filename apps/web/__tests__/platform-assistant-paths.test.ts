import { describe, expect, it } from 'vitest'
import {
  buildCollectionAssistantPageContext,
  normalizeAssistantPlatformProjectId,
} from '../lib/assistant-page-context'
import {
  ASSISTANT_EMBED_PRODUCT,
  buildPlatformAssistantEmbedUrl,
  mergeAssistantHostPageContext,
  postPlatformAssistantContext,
} from '../lib/platform-assistant-paths'

describe('audion assistant page context', () => {
  it('normalizes real Collection UUIDs only', () => {
    expect(
      normalizeAssistantPlatformProjectId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    ).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    expect(normalizeAssistantPlatformProjectId('local-project-id')).toBeUndefined()
  })

  it('merges published Collection into host context', () => {
    const merged = mergeAssistantHostPageContext({
      pathname: '/projects/p1',
      published: buildCollectionAssistantPageContext({
        pathname: '/projects/p1',
        platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      }),
    })
    expect(merged?.product).toBe('audion')
    expect(merged?.platformProjectId).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
  })
})

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
    expect(
      buildPlatformAssistantEmbedUrl({
        theme: 'msqdx',
        platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      }),
    ).toBe(
      'https://plexon-v3.example/assistant/embed?product=audion&project=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee&theme=msqdx',
    )
    process.env.NEXT_PUBLIC_PLEXON_URL = prev
  })

  it('posts assistant:context payload', () => {
    const posts: unknown[] = []
    const frame = {
      postMessage: (data: unknown) => {
        posts.push(data)
      },
    } as unknown as Window
    postPlatformAssistantContext(frame, 'https://plexon-v3.example', {
      product: 'audion',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      pathname: '/projects/p1',
    })
    expect(posts[0]).toMatchObject({
      source: 'plexon-assistant-host',
      type: 'assistant:context',
      product: 'audion',
    })
  })
})
