import { describe, expect, it } from 'vitest'
import {
  confidenceToPercent,
  formatSoftScoreValue,
  parseConfidencePercentInput,
  parseSoftScoreValueInput,
  softScoreScaleOptions,
} from '../lib/soft-score-display'

describe('formatSoftScoreValue', () => {
  it('keeps finite numbers as display numerals', () => {
    expect(formatSoftScoreValue(2)).toEqual({ kind: 'number', text: '2', numeric: 2 })
    expect(formatSoftScoreValue('4')).toEqual({ kind: 'number', text: '4', numeric: 4 })
  })

  it('formats categorical snake_case as readable text', () => {
    expect(formatSoftScoreValue('produktseite_bevorzugt_vermutet')).toEqual({
      kind: 'text',
      text: 'produktseite bevorzugt vermutet',
    })
  })

  it('handles empty values', () => {
    expect(formatSoftScoreValue(null)).toEqual({ kind: 'empty', text: '—' })
    expect(formatSoftScoreValue('')).toEqual({ kind: 'empty', text: '—' })
  })
})

describe('softScoreScaleOptions', () => {
  it('builds 1–5 and 1–6 selects', () => {
    expect(softScoreScaleOptions('1-5').kind).toBe('numeric')
    expect(softScoreScaleOptions('1-5').options.map((o) => o.value)).toEqual([
      '',
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect(softScoreScaleOptions('1-6_schulnote').max).toBe(6)
  })

  it('treats choice as free text', () => {
    expect(softScoreScaleOptions('choice').kind).toBe('text')
  })
})

describe('parse soft value / confidence', () => {
  it('coerces numeric scale values and clamps', () => {
    expect(parseSoftScoreValueInput('4', '1-5')).toBe(4)
    expect(parseSoftScoreValueInput('9', '1-5')).toBe(5)
    expect(parseSoftScoreValueInput('', '1-5')).toBeNull()
  })

  it('keeps choice strings', () => {
    expect(parseSoftScoreValueInput('produktseite_bevorzugt_vermutet', 'choice')).toBe(
      'produktseite_bevorzugt_vermutet',
    )
  })

  it('maps confidence percent ↔ 0–1', () => {
    expect(confidenceToPercent(0.55)).toBe('55')
    expect(parseConfidencePercentInput('40')).toBe(0.4)
    expect(parseConfidencePercentInput('150')).toBe(1)
    expect(parseConfidencePercentInput('')).toBeNull()
  })
})
