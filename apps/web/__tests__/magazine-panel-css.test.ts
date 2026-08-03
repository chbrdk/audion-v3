import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const css = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8')

describe('magazine panel product CSS', () => {
  it('magazine bands stay fill-free square (match DS editorial Panel)', () => {
    expect(css).toMatch(
      /\.audion-magazine-band\.ds-panel\s*\{[^}]*background:\s*transparent/,
    )
    expect(css).toMatch(
      /\.audion-magazine-band\.ds-panel\s*\{[^}]*border-radius:\s*0/,
    )
    expect(css).toMatch(
      /\.audion-magazine-band\.ds-panel\s*\{[^}]*padding:\s*clamp\([^)]+\)\s+0\s+clamp/,
    )
  })
})
