import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const css = readFileSync(
  path.resolve(__dirname, '../../../../msqdx-ui/packages/ui/src/css/button.css'),
  'utf8',
)
const btn = readFileSync(
  path.resolve(__dirname, '../../../../msqdx-ui/packages/ui/src/components/Button.tsx'),
  'utf8',
)

describe('magazine Button DS defaults', () => {
  it('CSS is square by default with md/lg magazine sizes', () => {
    expect(css).toMatch(/\.ds-btn\s*\{[^}]*border-radius:\s*0/)
    expect(css).toMatch(/\.ds-btn--md\s*\{[^}]*min-height:\s*2\.5rem/)
    expect(css).toMatch(/\.ds-btn--lg\s*\{[^}]*min-height:\s*3\.25rem/)
  })

  it('component defaults to md + square', () => {
    expect(btn).toMatch(/size = 'md'/)
    expect(btn).toMatch(/shape = 'square'/)
    expect(btn).toContain('export function buttonClassName')
  })
})
