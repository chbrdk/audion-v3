import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('audion platform assistant shell mount', () => {
  it('AppShell mounts host and paths document env key', () => {
    const root = join(__dirname, '..')
    const shell = readFileSync(join(root, 'components/app-shell.tsx'), 'utf8')
    const host = readFileSync(join(root, 'components/platform-assistant-host.tsx'), 'utf8')
    const paths = readFileSync(join(root, 'lib/paths.ts'), 'utf8')
    expect(shell).toContain('PlatformAssistantHost')
    expect(shell).toContain('AssistantPageContextProvider')
    expect(shell).toContain('ShellBrandCorner')
    expect(host).toContain('postPlatformAssistantTheme')
    expect(host).toContain('postPlatformAssistantContext')
    expect(host).toContain('assistant:ready')
    expect(host).toContain('embedSrcLockedRef')
    expect(host).toContain('headerActions')
    expect(paths).toContain('envPlexonPublicUrl')
    expect(paths).toContain('NEXT_PUBLIC_PLEXON_URL')
    expect(paths).toContain('ecosystemStagingPlexon')

    const projectDetail = readFileSync(join(root, 'components/project-detail-panel.tsx'), 'utf8')
    expect(projectDetail).toContain('AssistantPageContextPublisher')
    const personaPage = readFileSync(join(root, 'app/personas/[personaId]/page.tsx'), 'utf8')
    expect(personaPage).toContain('ASSISTANT_ENTITY_PERSONA')
    expect(personaPage).toContain('AssistantPageContextPublisher')
  })
})
