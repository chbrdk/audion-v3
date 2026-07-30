import { describe, expect, it } from 'vitest'
import type { PersonaVisualTile } from '@audion-v3/contracts'
import { mergeMoodboardTiles } from '../lib/moodboard-tiles'

const tile = (
  partial: Partial<PersonaVisualTile> & Pick<PersonaVisualTile, 'id' | 'category'>,
): PersonaVisualTile => ({
  imageUrl: `/img/${partial.id}.svg`,
  caption: partial.caption ?? partial.category,
  locked: false,
  ...partial,
})

describe('mergeMoodboardTiles', () => {
  it('keeps locked tiles and replaces unlocked', () => {
    const existing = [
      tile({ id: 'locked-tone', category: 'tone', imageUrl: '/keep-me.svg', locked: true }),
      tile({ id: 'old-material', category: 'material', imageUrl: '/old.svg', locked: false }),
    ]
    const generated = [
      tile({ id: 'new-tone', category: 'tone', imageUrl: '/replace-tone.svg' }),
      tile({ id: 'new-material', category: 'material', imageUrl: '/new-material.svg' }),
      tile({ id: 'new-ui', category: 'ui', imageUrl: '/new-ui.svg' }),
    ]

    const merged = mergeMoodboardTiles(existing, generated)

    expect(merged).toHaveLength(3)
    expect(merged[0]).toMatchObject({
      id: 'locked-tone',
      imageUrl: '/keep-me.svg',
      locked: true,
    })
    expect(merged.find((t) => t.category === 'tone')?.id).toBe('locked-tone')
    expect(merged.find((t) => t.category === 'material')).toMatchObject({
      id: 'new-material',
      locked: false,
    })
    expect(merged.find((t) => t.category === 'ui')?.id).toBe('new-ui')
  })

  it('skips generated tiles for locked categories (case-insensitive)', () => {
    const existing = [tile({ id: 'keep', category: 'Tone', locked: true })]
    const generated = [tile({ id: 'skip', category: 'tone' }), tile({ id: 'ok', category: 'space' })]
    const merged = mergeMoodboardTiles(existing, generated)
    expect(merged.map((t) => t.id)).toEqual(['keep', 'ok'])
  })

  it('first locked tile wins per category', () => {
    const existing = [
      tile({ id: 'first', category: 'ui', locked: true }),
      tile({ id: 'second', category: 'ui', locked: true }),
    ]
    const merged = mergeMoodboardTiles(existing, [tile({ id: 'gen', category: 'ui' })])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe('first')
  })
})
