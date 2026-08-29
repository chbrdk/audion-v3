import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const css = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8')

describe('editable list add row visibility', () => {
  it('keeps add rows visible by default (not hover-gated)', () => {
    expect(css).toMatch(/\.audion-editable-list-foot\s*\{[^}]*grid-template-rows:\s*1fr/)
    expect(css).toMatch(/\.audion-editable-list-add-row\s*\{[^}]*opacity:\s*1/)
    expect(css).not.toMatch(
      /\.audion-editable-list:hover\s+\.audion-editable-list-add-row[^{]*\{[^}]*opacity:\s*1/,
    )
  })
})
