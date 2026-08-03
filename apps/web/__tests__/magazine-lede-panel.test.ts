import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const components = path.join(root, 'components')

describe('magazine lede + panel cutover', () => {
  it('edit dialogs use LedeStrip steps', () => {
    const study = readFileSync(path.join(components, 'study-edit-dialog.tsx'), 'utf8')
    const wave = readFileSync(path.join(components, 'wave-edit-dialog.tsx'), 'utf8')
    for (const src of [study, wave]) {
      expect(src).toContain('LedeStrip')
      expect(src).toContain('variant="steps"')
      expect(src).not.toContain('WizardSteps')
    }
  })

  it('wave detail and queue use Lede / LedeStrip', () => {
    const wave = readFileSync(path.join(components, 'wave-detail-panel.tsx'), 'utf8')
    const queue = readFileSync(path.join(components, 'queue-dashboard-panel.tsx'), 'utf8')
    expect(wave).toContain('LedeStrip')
    expect(wave).toContain('Lede')
    expect(wave).not.toContain('StatLede')
    expect(queue).toContain('LedeStrip')
    expect(queue).not.toContain('StatLede')
  })

  it('collection tiles use Panel variant card', () => {
    const list = readFileSync(path.join(components, 'study-list-panel.tsx'), 'utf8')
    expect(list).toContain('variant="card"')
    expect(list).toContain('audion-tg-card-panel')
  })
})
