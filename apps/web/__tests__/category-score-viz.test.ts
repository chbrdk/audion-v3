import { describe, expect, it } from 'vitest'
import {
  categoryScoreDomain,
  formatSignedScore,
  shortCategoryLabel,
  signedScoreBarPct,
  signedScoreToRadar01,
  sortCategoryEntries,
} from '../lib/category-score-viz'

describe('category-score-viz', () => {
  it('maps zero to radar mid-ring and extremes to edges', () => {
    expect(signedScoreToRadar01(0, 2)).toBe(0.5)
    expect(signedScoreToRadar01(2, 2)).toBe(1)
    expect(signedScoreToRadar01(-2, 2)).toBe(0)
  })

  it('sizes bars from absolute magnitude', () => {
    expect(signedScoreBarPct(-1.5, 3)).toBe(50)
    expect(signedScoreBarPct(3, 3)).toBe(100)
    expect(signedScoreBarPct(0, 3)).toBe(0)
  })

  it('keeps a stable domain and short labels', () => {
    expect(categoryScoreDomain([])).toBe(1)
    expect(categoryScoreDomain([-2.85, 1.5])).toBe(2.85)
    expect(shortCategoryLabel('info_density')).toBe('Density')
    expect(formatSignedScore(1.5)).toBe('+1.5')
    expect(formatSignedScore(-0.67)).toBe('-0.67')
  })

  it('sorts category keys alphabetically', () => {
    const rows = sortCategoryEntries([
      ['visual', 1],
      ['affordance', -1],
    ])
    expect(rows.map((r) => r.key)).toEqual(['affordance', 'visual'])
  })
})
