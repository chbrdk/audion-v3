import type { ReactElement } from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { PersonaList, ProjectList } from '@audion-v3/contracts'
import { PersonaListPanel } from '../components/persona-list-panel'
import { ProjectListPanel } from '../components/project-list-panel'
import { paths } from '../lib/paths'
import { UserPrefsProvider } from '../lib/user-prefs'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))

function wrap(ui: ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

const personaList: PersonaList = {
  items: [
    {
      id: 'p1',
      name: 'Alex Morgan',
      role: 'Buyer',
      projectId: 'proj-1',
      status: 'ready',
      archetype: 'Explorer',
      updatedAt: null,
      avatarUrl: null,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
}

const projectList: ProjectList = {
  items: [
    {
      id: 'proj-1',
      name: 'North',
      nameDe: null,
      description: null,
      companyContext: null,
      status: 'published',
      personaCount: 2,
      targetGroupCount: 1,
      memberCount: 0,
      updatedAt: null,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
}

describe('hub index Cards|List layout', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('defaults to cards and switches to numbered list on personas', () => {
    const { container } = wrap(<PersonaListPanel list={personaList} query="" />)
    expect(container.querySelector('.audion-tg-grid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(container.querySelector('.audion-tg-grid')).toBeNull()
    expect(container.querySelector('.audion-hub-index-list')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Alex Morgan/i }).getAttribute('href')).toBe(
      paths.routes.personaDetail('p1'),
    )
    expect(sessionStorage.getItem(paths.hubIndexLayoutKey)).toBe('list')
  })

  it('shares the preference with projects hub', () => {
    sessionStorage.setItem(paths.hubIndexLayoutKey, 'list')
    const { container } = wrap(<ProjectListPanel list={projectList} />)
    expect(container.querySelector('.audion-hub-index-list')).toBeTruthy()
    expect(screen.getByRole('link', { name: /North/i }).getAttribute('href')).toBe(
      paths.routes.projectDetail('proj-1'),
    )
  })
})
