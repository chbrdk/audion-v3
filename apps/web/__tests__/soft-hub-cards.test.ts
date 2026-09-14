import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')

describe('soft hub cards', () => {
  it('project cards use --radius-tile', () => {
    const css = readFileSync(path.join(repoRoot, 'apps/web/app/globals.css'), 'utf8')
    expect(css).toMatch(/\.audion-tg-card-panel[\s\S]*?border-radius:\s*var\(--radius-tile/)
  })
})
