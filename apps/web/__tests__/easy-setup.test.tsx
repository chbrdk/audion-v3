import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EasySetupPanel } from '../components/easy-setup-panel'
import { ProjectListPanel } from '../components/project-list-panel'
import { paths } from '../lib/paths'
import type { ProjectEasySetupResponse, ProjectList } from '@audion-v3/contracts'

vi.mock('next/navigation', () => ({
  usePathname: () => '/setup',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

const bootstrapResponse: ProjectEasySetupResponse = {
  stubbed: true,
  websiteExcerptIncluded: false,
  project: {
    id: 'proj-easy-1',
    name: 'Acme Research',
    nameDe: null,
    description: 'Customer / brand: Acme',
    companyContext: 'We sell bikes',
    status: 'draft',
    personaCount: 1,
    targetGroupCount: 1,
    memberCount: 1,
    updatedAt: '2026-07-30T00:00:00.000Z',
    members: [],
    knowledgeChapters: [],
  },
  targetGroup: {
    id: 'tg-easy-1',
    name: 'Acme primary audience',
    segment: 'Primary buyers',
    description: 'We sell bikes',
    status: 'draft',
    personaCount: 1,
    projectId: 'proj-easy-1',
    updatedAt: '2026-07-30T00:00:00.000Z',
    linkedPersonas: [
      {
        id: 'persona-easy-1',
        name: 'Acme persona',
        role: 'Decision maker',
        status: 'draft',
        avatarUrl: null,
      },
    ],
    knowledgeEntries: [],
    documents: [],
  },
  persona: {
    id: 'persona-easy-1',
    name: 'Acme persona',
    role: 'Decision maker',
    projectId: 'proj-easy-1',
    status: 'draft',
    archetype: 'Primary buyers',
    updatedAt: '2026-07-30T00:00:00.000Z',
    avatarUrl: null,
    age: null,
    location: null,
    bio: 'Representative',
    gender: null,
    attentionSpan: null,
    colorPalette: [],
    mediaAffinity: null,
    confidence: null,
    techLiteracy: null,
    emotionalBaseline: null,
    stressTriggers: [],
    motivations: [],
    traits: {},
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    goals: [],
    frustrations: [],
    channels: [],
    sections: [],
    visuals: null,
    profileDe: null,
    headlineDe: null,
    journeyBehavior: null,
    knowledgeEntries: [],
    documents: [],
    tavusReplicaId: null,
    tavusPersonaId: null,
  },
}

describe('EasySetupPanel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('validates required fields before submit', async () => {
    render(<EasySetupPanel />)
    fireEvent.click(screen.getByTestId('easy-setup-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Customer name and about are required/i,
    )
  })

  it('shows success links after bootstrap', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(bootstrapResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    render(<EasySetupPanel />)
    fireEvent.change(screen.getByTestId('easy-setup-customer'), {
      target: { value: 'Acme' },
    })
    fireEvent.change(screen.getByTestId('easy-setup-about'), {
      target: { value: 'We sell bikes' },
    })
    fireEvent.click(screen.getByTestId('easy-setup-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('easy-setup-success')).toBeTruthy()
    })
    expect(screen.getByTestId('easy-setup-link-project').getAttribute('href')).toBe(
      paths.routes.projectDetail('proj-easy-1'),
    )
    expect(screen.getByTestId('easy-setup-link-tg').getAttribute('href')).toBe(
      paths.routes.targetGroupDetail('tg-easy-1'),
    )
    expect(screen.getByTestId('easy-setup-link-persona').getAttribute('href')).toBe(
      paths.routes.personaDetail('persona-easy-1'),
    )
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      paths.routes.apiProjectsBootstrap,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('ProjectListPanel Easy setup CTA', () => {
  afterEach(() => cleanup())

  it('links to /setup from the projects grid', () => {
    const list: ProjectList = { items: [], total: 0, page: 1, pageSize: 50 }
    render(<ProjectListPanel list={list} />)
    const link = screen.getByRole('link', { name: /Easy setup/i })
    expect(link.getAttribute('href')).toBe(paths.routes.setup)
  })
})
