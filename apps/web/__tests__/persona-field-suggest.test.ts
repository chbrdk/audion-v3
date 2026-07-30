import { describe, expect, it } from 'vitest'
import {
  mergeFrustrationSuggestions,
  mergeGoalSuggestions,
  mergeStringSuggestions,
  mergeTraitSuggestions,
  suggestionTitles,
} from '../lib/persona-field-suggest'

describe('persona field suggest merges', () => {
  it('dedupes string suggestions case-insensitively', () => {
    expect(mergeStringSuggestions(['Service design', 'Ops'], ['service design', 'Narrative'])).toEqual([
      'Service design',
      'Ops',
      'Narrative',
    ])
  })

  it('appends goals and frustrations as objects', () => {
    expect(mergeGoalSuggestions([{ label: 'Ship', priority: 0 }], ['Ship', 'Decide'])).toEqual([
      { label: 'Ship', priority: 0 },
      { label: 'Decide', priority: 1 },
    ])
    expect(mergeFrustrationSuggestions([], ['Noise'])).toEqual([
      { label: 'Noise', evidenceCount: 0 },
    ])
  })

  it('adds new traits at default score', () => {
    expect(mergeTraitSuggestions({ Analytical: 0.8 }, ['Analytical', 'Curious'])).toEqual({
      Analytical: 0.8,
      Curious: 0.7,
    })
  })

  it('maps suggestion titles', () => {
    expect(suggestionTitles([{ id: '1', title: ' A ' }, { id: '2', title: '' }])).toEqual(['A'])
  })
})
