import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')

describe('flush hub cards', () => {
  it('audience/study tiles match CollectionHubCard: square, gapless', () => {
    const css = readFileSync(path.join(repoRoot, 'apps/web/app/globals.css'), 'utf8')
    expect(css).toMatch(/\.audion-tg-grid\s*\{[\s\S]*?gap:\s*0;/)
    expect(css).toMatch(/\.audion-tg-card-panel(?:\.ds-panel\.module-panel)?\s*,?\s*[\s\S]*?border-radius:\s*0;/)
    expect(css).not.toMatch(/\.audion-tg-card-panel[\s\S]*?border-radius:\s*var\(--radius-tile/)
  })

  it('styles create/AI tiles without requiring Panel classes', () => {
    const css = readFileSync(path.join(repoRoot, 'apps/web/app/globals.css'), 'utf8')
    expect(css).toMatch(/\.audion-tg-card-panel\s*,/)
    expect(css).toMatch(/\.audion-tg-card-panel--create\s*,/)
  })
})
