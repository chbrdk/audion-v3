import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const css = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8')

describe('target-group hub card overflow', () => {
  it('keeps long titles inside the card via wrap + clip', () => {
    expect(css).toMatch(
      /\.audion-tg-card-title\s*\{[^}]*max-width:\s*min\(14ch,\s*100%\)/,
    )
    expect(css).toMatch(/\.audion-tg-card-title\s*\{[^}]*overflow-wrap:\s*anywhere/)
    expect(css).toMatch(/\.audion-tg-card-title\s*\{[^}]*word-break:\s*break-word/)
    expect(css).toMatch(
      /\.audion-tg-card-panel\.ds-panel\.module-panel\s*\{[^}]*overflow:\s*hidden/,
    )
    expect(css).toMatch(/\.audion-tg-card\s*\{[^}]*min-width:\s*0/)
  })
})
