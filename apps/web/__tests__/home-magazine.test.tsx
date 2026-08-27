import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type {
  JourneySummary,
  PersonaSummary,
  ProjectSummary,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import {
  buildHomeRecentJourneys,
  buildHomeRecentPersonas,
  buildHomeRecentProjects,
  buildHomeRecentTargetGroups,
  HomeMagazine,
} from '../components/home-magazine'
import { UserPrefsProvider } from '../lib/user-prefs'

function wrap(ui: ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

const persona = (over: Partial<PersonaSummary>): PersonaSummary => ({
  id: 'per-1',
  name: 'Alex',
  role: 'Buyer',
  projectId: 'proj-1',
  status: 'ready',
  archetype: null,
  updatedAt: '2026-08-20T12:00:00.000Z',
  avatarUrl: null,
  ...over,
})

const project = (over: Partial<ProjectSummary>): ProjectSummary => ({
  id: 'proj-1',
  name: 'Alpha',
  nameDe: null,
  description: null,
  companyContext: null,
  status: 'published',
  personaCount: 2,
  targetGroupCount: 1,
  memberCount: 0,
  updatedAt: '2026-08-20T12:00:00.000Z',
  ...over,
})

const group = (over: Partial<TargetGroupSummary>): TargetGroupSummary => ({
  id: 'tg-1',
  name: 'SMB',
  segment: 'B2B',
  description: null,
  status: 'active',
  personaCount: 3,
  projectId: 'proj-1',
  updatedAt: '2026-08-20T12:00:00.000Z',
  ...over,
})

const journey = (over: Partial<JourneySummary>): JourneySummary => ({
  id: 'j-1',
  name: 'Onboarding',
  journeyType: 'awareness',
  status: 'active',
  phaseCount: 4,
  targetGroupId: null,
  targetGroupName: null,
  projectId: 'proj-1',
  updatedAt: '2026-08-20T12:00:00.000Z',
  ...over,
})

describe('buildHomeRecent*', () => {
  it('orders by updatedAt then name and caps at limit', () => {
    const list = buildHomeRecentProjects(
      [
        project({ id: 'a', name: 'Zebra', updatedAt: '2026-08-10T12:00:00.000Z' }),
        project({ id: 'b', name: 'Alpha', updatedAt: '2026-08-22T12:00:00.000Z' }),
        project({ id: 'c', name: 'Beta', updatedAt: null }),
        project({ id: 'd', name: 'Gamma', updatedAt: '2026-08-21T12:00:00.000Z' }),
        project({ id: 'e', name: 'Delta', updatedAt: '2026-08-20T12:00:00.000Z' }),
        project({ id: 'f', name: 'Extra', updatedAt: '2026-08-19T12:00:00.000Z' }),
      ],
      5,
    )
    expect(list.map((p) => p.id)).toEqual(['b', 'd', 'e', 'f', 'a'])
  })

  it('sorts personas and target groups the same way', () => {
    expect(
      buildHomeRecentPersonas(
        [
          persona({ id: 'old', name: 'Zoe', updatedAt: '2026-08-01T12:00:00.000Z' }),
          persona({ id: 'new', name: 'Ann', updatedAt: '2026-08-25T12:00:00.000Z' }),
        ],
        8,
      ).map((p) => p.id),
    ).toEqual(['new', 'old'])

    expect(
      buildHomeRecentTargetGroups(
        [
          group({ id: 'g1', name: 'B', updatedAt: '2026-08-10T12:00:00.000Z' }),
          group({ id: 'g2', name: 'A', updatedAt: '2026-08-10T12:00:00.000Z' }),
        ],
        8,
      ).map((g) => g.id),
    ).toEqual(['g2', 'g1'])
  })

  it('caps journeys at five', () => {
    const list = buildHomeRecentJourneys(
      Array.from({ length: 7 }, (_, i) =>
        journey({
          id: `j-${i}`,
          name: `J${i}`,
          updatedAt: `2026-08-${String(10 + i).padStart(2, '0')}T12:00:00.000Z`,
        }),
      ),
      5,
    )
    expect(list).toHaveLength(5)
    expect(list[0]?.id).toBe('j-6')
  })
})

describe('HomeMagazine', () => {
  it('renders cover, topic tiles, recent columns, and journey strip', () => {
    wrap(
      <HomeMagazine
        personas={[persona({ id: 'p1', name: 'Nora' })]}
        projects={[project({ id: 'pr1', name: 'North' })]}
        targetGroups={[group({ id: 'tg1', name: 'Retail' })]}
        journeys={[journey({ id: 'j1', name: 'Checkout' })]}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'AUDION' })).toBeTruthy()
    expect(screen.getByLabelText('Topic entry points')).toBeTruthy()
    expect(screen.getByLabelText('Recent personas, projects, and target groups')).toBeTruthy()

    const personasCol = screen.getByLabelText('Recent personas')
    expect(personasCol.querySelector('a.audion-home-recent-list__title')?.getAttribute('href')).toBe(
      '/personas/p1',
    )
    const projectsCol = screen.getByLabelText('Recent projects')
    expect(projectsCol.querySelector('a.audion-home-recent-list__title')?.getAttribute('href')).toBe(
      '/projects/pr1',
    )
    const groupsCol = screen.getByLabelText('Recent target groups')
    expect(groupsCol.querySelector('a.audion-home-recent-list__title')?.getAttribute('href')).toBe(
      '/target-groups/tg1',
    )

    expect(screen.getByLabelText('Recent journeys')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Checkout' })).toBeTruthy()
  })
})
