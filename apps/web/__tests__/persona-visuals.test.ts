import { describe, expect, it } from 'vitest'
import { personaVisualPath } from '../lib/paths'
import {
  blankPersonaVisualTile,
  emptyPersonaVisuals,
  resolvePersonaVisuals,
  toPersonaWriteVisuals,
} from '../lib/persona-visuals'

describe('persona visuals helpers', () => {
  it('resolves null to an empty board', () => {
    expect(resolvePersonaVisuals(null)).toEqual(emptyPersonaVisuals())
  })

  it('keeps stable tile ids and drops blank keywords', () => {
    expect(
      resolvePersonaVisuals({
        styleKeywords: ['calm', '  ', 'warm'],
        tiles: [{ id: '', imageUrl: '/a.svg', category: ' tone ', caption: 'Tone' }],
      }),
    ).toEqual({
      styleKeywords: ['calm', 'warm'],
      tiles: [{ id: 'tile-0', imageUrl: '/a.svg', category: 'tone', caption: 'Tone' }],
    })
  })

  it('serializes write payload and nulls fully empty boards', () => {
    expect(toPersonaWriteVisuals(emptyPersonaVisuals())).toBeNull()
    expect(
      toPersonaWriteVisuals({
        styleKeywords: [' calm editorial '],
        tiles: [
          {
            id: 't1',
            imageUrl: ' /fixtures/x.svg ',
            category: 'portrait',
            caption: ' Portrait ',
          },
          { id: 't2', imageUrl: '   ', category: 'tone', caption: null },
        ],
      }),
    ).toEqual({
      styleKeywords: ['calm editorial'],
      tiles: [
        {
          id: 't1',
          imageUrl: '/fixtures/x.svg',
          category: 'portrait',
          caption: 'Portrait',
        },
      ],
    })
  })

  it('creates a blank tile with fixture image path', () => {
    const tile = blankPersonaVisualTile()
    expect(tile.id).toMatch(/^tile-/)
    expect(tile.imageUrl).toBe(personaVisualPath('tone-warm'))
    expect(tile.category).toBe('visual')
  })
})
