import { describe, expect, it } from 'vitest'
import { mergeProjectLists } from '../lib/projects'
import type { ProjectList } from '@audion-v3/contracts'

describe('mergeProjectLists', () => {
  it('keeps fixture-only provisioned projects when API list is empty', () => {
    const api: ProjectList = { items: [], total: 0, page: 1, pageSize: 50 }
    const fixtures: ProjectList = {
      items: [
        {
          id: 'proj-test3',
          name: 'test3',
          nameDe: null,
          description: null,
          companyContext: null,
          status: 'published',
          personaCount: 0,
          targetGroupCount: 0,
          memberCount: 1,
          updatedAt: '2026-07-31T12:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    }
    const merged = mergeProjectLists(api, fixtures)
    expect(merged.items.map((i) => i.id)).toEqual(['proj-test3'])
  })
})
