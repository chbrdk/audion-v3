import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')

const requiredSpecs = [
  'specs/domain/app-shell.md',
  'specs/domain/persona-workspace.md',
  'specs/domain/persona-fields.md',
  'specs/domain/target-group-workspace.md',
  'specs/domain/target-group-fields.md',
  'specs/domain/journey-workspace.md',
  'specs/domain/journey-fields.md',
  'specs/domain/ux-study-workspace.md',
  'specs/domain/ux-study-fields.md',
  'specs/domain/chat-workspace.md',
  'specs/domain/chat-fields.md',
  'specs/domain/chat-image-attachments.md',
  'specs/domain/chat-embed.md',
  'specs/domain/tavus-video-chat.md',
  'knowledge/tavus-video-chat.md',
  'specs/domain/project-workspace.md',
  'specs/domain/project-fields.md',
  'specs/domain/knowledge-pack-publish.md',
  'specs/domain/edit-dialogs.md',
  'specs/api/personas.md',
  'specs/api/target-groups.md',
  'specs/api/journeys.md',
  'specs/api/ux-studies.md',
  'specs/api/chat.md',
  'knowledge/specs-index.md',
  'knowledge/edit-wave.md',
  'knowledge/paths.md',
  'knowledge/ux-studies.md',
  'knowledge/journey-migration-map.md',
  'knowledge/chat-migration-map.md',
  'knowledge/journeys-chat-gaps.md',
] as const

describe('specs inventory', () => {
  it('keeps accepted domain/api specs and knowledge indexes on disk', () => {
    for (const rel of requiredSpecs) {
      expect(existsSync(path.join(repoRoot, rel)), `missing ${rel}`).toBe(true)
    }
  })

  it('registers journey and chat routes in paths.ts', async () => {
    const { paths } = await import('../lib/paths')
    expect(paths.routes.journeys).toBe('/journeys')
    expect(paths.routes.journeyDetail('j1')).toBe('/journeys/j1')
    expect(paths.routes.apiJourneys).toBe('/api/journeys')
    expect(paths.routes.studies).toBe('/studies')
    expect(paths.routes.studyDetail('s1')).toBe('/studies/s1')
    expect(paths.routes.apiStudies).toBe('/api/studies')
    expect(paths.routes.chat).toBe('/chat')
    expect(paths.routes.chatHistory).toBe('/chat/history')
    expect(paths.routes.chatEmbedPath).toBe('/chat/embed')
    expect(paths.routes.apiChatStream).toBe('/api/chat/stream')
    expect(paths.routes.apiChatImagesUpload).toBe('/api/chat/images/upload')
    expect(paths.chatImageUploadMaxBytes).toBe(10 * 1024 * 1024)
    expect(paths.envChatApiInternal).toBe('NEXT_CHAT_API_INTERNAL_URL')
    expect(paths.envChatEmbedFrameAncestors).toBe('AUDION_CHAT_EMBED_FRAME_ANCESTORS')
    expect(paths.routes.apiChatTavusSession).toBe('/api/chat/tavus/session')
    expect(paths.envTavusApiKey).toBe('TAVUS_API_KEY')
    expect(paths.tavusConversationsPath).toBe('/v2/conversations')
  })
})
