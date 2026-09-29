import { describe, expect, it } from 'vitest'
import {
  personaRecordMatchesQuery,
  personaTextMatchesQuery,
} from '../lib/persona-name-match'
import { filterPersonaList } from '../lib/personas'
import type { PersonaList } from '@audion-v3/contracts'

describe('persona-name-match', () => {
  it('matches exact and substring names', () => {
    expect(personaTextMatchesQuery('Markus Reinhardt', 'Markus Reinhardt')).toBe(true)
    expect(personaTextMatchesQuery('Markus Reinhardt', 'reinhardt')).toBe(true)
    expect(personaTextMatchesQuery('Markus Reinhardt', 'Markus')).toBe(true)
  })

  it('tolerates minor last-name typos (Reinhard vs Reinhardt)', () => {
    expect(personaTextMatchesQuery('Markus Reinhardt', 'Markus Reinhard')).toBe(true)
    expect(personaRecordMatchesQuery({ name: 'Markus Reinhardt', role: 'Buyer' }, 'Markus Reinhard')).toBe(
      true,
    )
  })

  it('does not match unrelated names', () => {
    expect(personaTextMatchesQuery('Anna Schmidt', 'Markus Reinhardt')).toBe(false)
  })
})

describe('filterPersonaList fuzzy', () => {
  const list: PersonaList = {
    items: [
      {
        id: 'p1',
        slug: 'markus-reinhardt',
        name: 'Markus Reinhardt',
        role: 'Entscheider',
        status: 'ready',
        avatarUrl: null,
        projectId: 'proj-a',
      },
      {
        id: 'p2',
        slug: 'jana-schmitt',
        name: 'Jana Schmitt',
        role: 'Öko',
        status: 'ready',
        avatarUrl: null,
        projectId: 'proj-a',
      },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
  }

  it('finds Markus with typo query', () => {
    const filtered = filterPersonaList(list, 'Markus Reinhard')
    expect(filtered.items.map((p) => p.id)).toEqual(['p1'])
  })
})
