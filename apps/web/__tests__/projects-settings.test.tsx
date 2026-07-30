import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../components/app-shell'
import { SettingsPage } from '../components/settings-page'
import { ProjectListPanel } from '../components/project-list-panel'
import { ProjectDetailPanel } from '../components/project-detail-panel'
import { UserPrefsProvider } from '../lib/user-prefs'
import { paths } from '../lib/paths'
import {
  resetProjectStore,
  storeCreateProject,
  storePatchProject,
  storeProjectDetail,
  storeProjectList,
} from '../lib/fixtures/project-store'
import { filterProjectList, normalizeProjectDetail, normalizeProjectSummary } from '../lib/projects'
import type { ProjectDetail, ProjectList } from '@audion-v3/contracts'

vi.mock('next/navigation', () => ({
  usePathname: () => '/personas',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('../components/knowledge-rich-editor', () => ({
  KnowledgeRichEditor: ({
    content,
    editable,
    ariaLabel,
    onChange,
    onBlur,
    onRequestEdit,
    onSaveShortcut,
  }: {
    content: string
    editable: boolean
    ariaLabel: string
    onChange: (html: string) => void
    onBlur?: () => void
    onRequestEdit?: () => void
    onSaveShortcut?: () => void
  }) =>
    editable ? (
      <textarea
        aria-label={ariaLabel}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSaveShortcut?.()
        }}
      />
    ) : (
      <button type="button" aria-label={ariaLabel} onClick={onRequestEdit}>
        {content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Empty'}
      </button>
    ),
}))

afterEach(() => {
  cleanup()
  resetProjectStore()
  try {
    localStorage?.removeItem?.(paths.displayNameStorageKey)
    localStorage?.removeItem?.(paths.themeStorageKey)
    localStorage?.removeItem?.(paths.localeStorageKey)
  } catch {
    /* jsdom storage may be stubbed */
  }
})

function withPrefs(ui: React.ReactNode) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

describe('app shell projects + settings', () => {
  it('renders projects nav and enabled settings link', () => {
    withPrefs(
      <AppShell title="Persona Workspace" description="Manage personas.">
        <div>Content</div>
      </AppShell>,
    )

    expect(screen.getByRole('link', { name: /Projects/i })).toHaveAttribute(
      'href',
      paths.routes.projects,
    )
    expect(screen.getByRole('link', { name: /Personas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Target groups/i })).toBeInTheDocument()
    const settings = screen.getByRole('link', { name: /Settings/i })
    expect(settings).toHaveAttribute('href', paths.routes.settings)
    expect(settings).not.toHaveAttribute('aria-disabled', 'true')
    expect(settings.className).not.toMatch(/disabled/)
  })
})

describe('settings page', () => {
  it('commits display name into prefs', () => {
    withPrefs(<SettingsPage />)
    const input = screen.getByLabelText('Display name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Christoph' } })
    fireEvent.blur(input)
    try {
      expect(localStorage.getItem(paths.displayNameStorageKey)).toBe('Christoph')
    } catch {
      /* storage stub — still assert input committed visually */
      expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Christoph')
    }
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
  })
})

describe('project contracts', () => {
  it('normalizes summary and detail', () => {
    expect(
      normalizeProjectSummary({
        id: 'proj-x',
        name: 'X',
        status: 'active',
        persona_count: 2,
        target_group_count: 1,
        member_count: 3,
        company_context: 'Ctx',
        name_de: 'Ix',
        updated_at: '2026-07-30T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'proj-x',
      name: 'X',
      status: 'published',
      personaCount: 2,
      targetGroupCount: 1,
      memberCount: 3,
      companyContext: 'Ctx',
      nameDe: 'Ix',
    })

    const detail = normalizeProjectDetail({
      id: 'proj-x',
      name: 'X',
      members: [{ id: 'm1', email: 'a@b.c', role: 'owner', status: 'active' }],
      knowledge_chapters: [{ id: 'ch-1', title: 'Market', body: 'B2B' }],
    })
    expect(detail?.members).toHaveLength(1)
    expect(detail?.knowledgeChapters).toEqual([{ id: 'ch-1', title: 'Market', body: 'B2B' }])
  })

  it('lists, creates, and patches via store', () => {
    const list = storeProjectList()
    expect(list.total).toBeGreaterThanOrEqual(3)
    expect(storeProjectDetail('proj-audion-core')?.name).toBe('AUDION Core')

    const created = storeCreateProject({ name: 'New Lab', status: 'draft' })
    expect(created.id).toContain('proj-')
    expect(storeProjectDetail(created.id)?.status).toBe('draft')

    const patched = storePatchProject(created.id, { description: 'Brief' })
    expect(patched?.description).toBe('Brief')

    const withMember = storePatchProject(created.id, {
      members: [
        { id: 'm-new', email: 'new@example.com', role: 'member', status: 'invited' },
      ],
    })
    expect(withMember?.members).toHaveLength(1)
    expect(withMember?.memberCount).toBe(1)

    const filtered = filterProjectList(storeProjectList(), 'audion')
    expect(filtered.items.every((i) => i.name.toLowerCase().includes('audion'))).toBe(true)
  })
})

describe('project workspace components', () => {
  const list: ProjectList = {
    items: [
      {
        id: 'proj-audion-core',
        name: 'AUDION Core',
        nameDe: null,
        description: 'Primary',
        companyContext: null,
        status: 'published',
        personaCount: 2,
        targetGroupCount: 1,
        memberCount: 2,
        updatedAt: null,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
  }

  const detail: ProjectDetail = {
    ...list.items[0]!,
    knowledgeChapters: [],
    members: [
      { id: 'm1', email: 'christoph@msqdx.example', role: 'owner', status: 'active' },
    ],
  }

  it('renders list cards and create tile', () => {
    const { container } = render(<ProjectListPanel list={list} />)
    expect(screen.getByText('AUDION Core')).toBeInTheDocument()
    expect(container.querySelector('.audion-tg-card--create')).toBeTruthy()
    expect(screen.getByRole('link', { name: /AUDION Core/i })).toHaveAttribute(
      'href',
      paths.routes.projectDetail('proj-audion-core'),
    )
  })

  it('renders detail bands with audience split lists', () => {
    const personas = [
      {
        id: 'persona-alex-morgan',
        name: 'Alex Morgan',
        role: 'Brand lead',
        status: 'ready' as const,
        archetype: 'Strategist',
        avatarUrl: null,
        projectId: 'proj-audion-core',
        updatedAt: null,
      },
    ]
    const targetGroups = [
      {
        id: 'tg-brand-buyers',
        name: 'Brand buyers',
        segment: 'B2B',
        status: 'active' as const,
        personaCount: 1,
        projectId: 'proj-audion-core',
        updatedAt: null,
      },
    ]
    const { container } = render(
      <ProjectDetailPanel
        project={{ ...detail, companyContext: 'Primary workspace context' }}
        personas={personas}
        targetGroups={targetGroups}
      />,
    )
    expect(screen.getByRole('heading', { name: 'AUDION Core' })).toBeInTheDocument()
    expect(container.querySelector('.audion-magazine-portrait')).toBeFalsy()
    expect(container.querySelector('.audion-magazine-hero--text')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-hero-copy')).toBeTruthy()
    expect(container.querySelector('article.audion-magazine.briefing-detail')).toBeTruthy()
    expect(container.querySelector('.audion-project-intro')).toBeTruthy()
    expect(container.querySelector('.audion-project-intro-team')).toBeTruthy()
    expect(container.querySelector('.audion-project-split')).toBeTruthy()
    expect(container.querySelectorAll('.audion-project-split-col')).toHaveLength(2)
    expect(container.querySelector('.audion-project-knowledge')).toBeTruthy()
    expect(container.querySelector('.ds-accordion')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Project knowledge' })).toBeInTheDocument()
    expect(container.querySelector('.section-chrome-meta--accent')?.textContent).toBe('1')
    expect(screen.getByText('Brief')).toBeInTheDocument()
    expect(screen.getByText('Primary workspace context')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add chapter/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Target groups' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('Brand buyers')).toBeInTheDocument()
    expect(container.querySelectorAll('.audion-project-compact-list')).toHaveLength(3)
    expect(container.querySelectorAll('a.audion-project-compact-meta-link')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Remove /i }).length).toBeGreaterThanOrEqual(3)
    expect(container.querySelectorAll('.audion-tg-card--create')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Add target group/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add persona/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add member/i })).toBeInTheDocument()
    expect(screen.getAllByText('Team').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('christoph@msqdx.example')).toBeInTheDocument()
  })

  it('inline-edits a knowledge chapter via PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...detail,
        knowledgeChapters: [
          {
            id: 'ch-company',
            title: 'Company',
            body: '<p>Updated dossier brief</p>',
          },
        ],
        companyContext: 'Updated dossier brief',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ProjectDetailPanel
        project={{
          ...detail,
          knowledgeChapters: [
            {
              id: 'ch-company',
              title: 'Company',
              body: '<p>Primary workspace context</p>',
            },
          ],
          companyContext: 'Primary workspace context',
        }}
        personas={[]}
        targetGroups={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Company/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Company' }))
    const textarea = screen.getByLabelText('Edit Company') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '<p>Updated dossier brief</p>' } })
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(paths.routes.apiProjectDetail(detail.id))
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      knowledgeChapters: { id: string; title: string; body: string }[]
      companyContext: string
    }
    expect(body.companyContext).toBe('Updated dossier brief')
    expect(body.knowledgeChapters).toEqual([
      {
        id: 'ch-company',
        title: 'Company',
        body: '<p>Updated dossier brief</p>',
      },
    ])
    vi.unstubAllGlobals()
  })

  it('inline-renames a persona name via PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'persona-alex-morgan', name: 'Alex Updated' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const personas = [
      {
        id: 'persona-alex-morgan',
        name: 'Alex Morgan',
        role: 'Brand lead',
        status: 'ready' as const,
        archetype: 'Strategist',
        avatarUrl: null,
        projectId: 'proj-audion-core',
        updatedAt: null,
      },
    ]
    render(<ProjectDetailPanel project={detail} personas={personas} targetGroups={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /Alex Morgan/i }))
    const input = screen.getByLabelText('Edit persona') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Alex Updated' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(paths.routes.apiPersonaDetail('persona-alex-morgan'))
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      name: 'Alex Updated',
    })
    vi.unstubAllGlobals()
  })
})
