import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PersonaListPanel } from '../components/persona-list-panel'
import { ProjectDetailPanel } from '../components/project-detail-panel'
import { JourneyListPanel } from '../components/journey-list-panel'
import { TargetGroupListPanel } from '../components/target-group-list-panel'
import { resetProjectStore, storeProjectDetail } from '../lib/fixtures/project-store'
import { resetJourneyStore } from '../lib/fixtures/journey-store'
import type { JourneyList, PersonaList, TargetGroupList } from '@audion-v3/contracts'

vi.mock('next/navigation', () => ({
  usePathname: () => '/personas',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('../components/knowledge-rich-editor', () => ({
  KnowledgeRichEditor: () => null,
}))

afterEach(() => {
  cleanup()
  resetProjectStore()
  resetJourneyStore()
})

const emptyPersonaList: PersonaList = { items: [], total: 0, page: 1, pageSize: 50 }
const emptyTgList: TargetGroupList = { items: [], total: 0, page: 1, pageSize: 50 }
const emptyJourneyList: JourneyList = { items: [], total: 0, page: 1, pageSize: 50 }

describe('AI action buttons smoke', () => {
  it('renders Generate with AI on personas index', () => {
    render(<PersonaListPanel list={emptyPersonaList} query="" />)
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeTruthy()
  })

  it('renders Suggest with AI on target groups index', () => {
    render(<TargetGroupListPanel list={emptyTgList} />)
    expect(screen.getByRole('button', { name: /Suggest with AI/i })).toBeTruthy()
  })

  it('renders Generate with AI on journeys index', () => {
    render(<JourneyListPanel list={emptyJourneyList} />)
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeTruthy()
  })

  it('renders project AI band actions', async () => {
    const project = await storeProjectDetail('proj-audion-core')
    expect(project).toBeTruthy()
    render(
      <ProjectDetailPanel
        project={project!}
        personas={[]}
        targetGroups={[
          {
            id: 'tg-digital-product-leads',
            name: 'Digital product leads',
            segment: 'B2B',
            description: null,
            status: 'active',
            personaCount: 1,
            projectId: 'proj-audion-core',
            updatedAt: null,
          },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: /Suggest with AI/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Suggest personas/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Start research/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Generate journey/i })).toBeTruthy()
  })

  it('opens generate personas dialog from card', async () => {
    render(<PersonaListPanel list={emptyPersonaList} query="" />)
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }))
    await waitFor(() => {
      expect(screen.getByText(/Create draft personas/i)).toBeTruthy()
    })
  })
})
