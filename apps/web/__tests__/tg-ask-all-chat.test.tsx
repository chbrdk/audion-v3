import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PersonaSummary,
  ProjectSummary,
  TargetGroupDetail,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import { AudionChatWorkspace } from '../components/audion-chat-workspace'
import { AudionProjectChatPanel } from '../components/audion-project-chat-panel'
import { AudionTargetGroupChatPanel } from '../components/audion-target-group-chat-panel'
import {
  buildChatProjectHref,
  buildChatTargetGroupHref,
  createProjectRound,
  createTgRound,
  MAX_ASK_ALL_CHAT_PERSONAS,
  MAX_TG_CHAT_PERSONAS,
  selectProjectChatPersonas,
  selectTgChatPersonas,
} from '../lib/chat/tg-ask-all'
import { paths } from '../lib/paths'

const postChatStreamMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('../lib/chat/stream-client', () => ({
  postChatStream: (...args: unknown[]) => postChatStreamMock(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/chat',
}))

vi.mock('../components/app-shell', () => ({
  AppShell: ({
    children,
    leading,
  }: {
    children: React.ReactNode
    leading?: React.ReactNode
  }) => (
    <div>
      <header className="topbar">
        <div className="topbar-brand">{leading}</div>
      </header>
      <div className="page-body">{children}</div>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  postChatStreamMock.mockReset()
  replaceMock.mockReset()
})

const linked = [
  {
    id: 'persona-a',
    name: 'Alex',
    role: 'Lead',
    status: 'ready',
    avatarUrl: null,
  },
  {
    id: 'persona-b',
    name: 'Samira',
    role: 'Researcher',
    status: 'ready',
    avatarUrl: null,
  },
]

const targetGroup: TargetGroupDetail = {
  id: 'tg-digital-product-leads',
  name: 'Digital Product Leads',
  segment: 'B2B',
  description: null,
  status: 'active',
  personaCount: 2,
  projectId: 'proj-audion-core',
  updatedAt: null,
  linkedPersonas: linked,
  knowledgeEntries: [],
  documents: [],
}

const tgSummaries: TargetGroupSummary[] = [
  {
    id: targetGroup.id,
    name: targetGroup.name,
    segment: targetGroup.segment,
    description: null,
    status: 'active',
    personaCount: 2,
    projectId: 'proj-audion-core',
    updatedAt: null,
  },
]

const projectPersonas: PersonaSummary[] = [
  {
    id: 'persona-a',
    name: 'Alex',
    role: 'Lead',
    projectId: 'proj-audion-core',
    status: 'ready',
    archetype: null,
    updatedAt: null,
    avatarUrl: null,
  },
  {
    id: 'persona-b',
    name: 'Samira',
    role: 'Researcher',
    projectId: 'proj-audion-core',
    status: 'ready',
    archetype: null,
    updatedAt: null,
    avatarUrl: null,
  },
  {
    id: 'persona-other',
    name: 'Other',
    role: 'Ops',
    projectId: 'proj-other',
    status: 'ready',
    archetype: null,
    updatedAt: null,
    avatarUrl: null,
  },
]

const projects: ProjectSummary[] = [
  {
    id: 'proj-audion-core',
    name: 'Audion Core',
    nameDe: null,
    description: null,
    companyContext: null,
    status: 'published',
    personaCount: 2,
    targetGroupCount: 0,
    memberCount: 0,
    updatedAt: null,
  },
]

describe('tg-ask-all helpers', () => {
  it('caps linked personas and builds rounds', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `p-${i}`,
      name: `P${i}`,
      role: 'R',
      status: 'ready',
      avatarUrl: null,
    }))
    expect(selectTgChatPersonas(many)).toHaveLength(MAX_TG_CHAT_PERSONAS)
    const round = createTgRound({ question: '  Hello?  ', linked: many })
    expect(round.question).toBe('Hello?')
    expect(round.slots).toHaveLength(MAX_TG_CHAT_PERSONAS)
    expect(round.slots[0]?.status).toBe('pending')
    expect(buildChatTargetGroupHref('tg-1')).toBe('/chat?targetGroupId=tg-1')
    expect(paths.routes.chatTargetGroup('tg-1')).toBe('/chat?targetGroupId=tg-1')
  })

  it('filters project personas and builds project rounds', () => {
    expect(selectProjectChatPersonas(projectPersonas, 'proj-audion-core')).toHaveLength(2)
    expect(selectProjectChatPersonas(projectPersonas, 'proj-missing')).toHaveLength(0)
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...projectPersonas[0]!,
      id: `p-${i}`,
      name: `P${i}`,
    }))
    expect(selectProjectChatPersonas(many, 'proj-audion-core')).toHaveLength(
      MAX_ASK_ALL_CHAT_PERSONAS,
    )
    const round = createProjectRound({
      question: '  Barriers?  ',
      personas: many,
      projectId: 'proj-audion-core',
    })
    expect(round.question).toBe('Barriers?')
    expect(round.slots).toHaveLength(MAX_ASK_ALL_CHAT_PERSONAS)
    expect(buildChatProjectHref('proj-1')).toBe('/chat?projectId=proj-1')
    expect(paths.routes.chatProject('proj-1')).toBe('/chat?projectId=proj-1')
  })
})

describe('AudionTargetGroupChatPanel', () => {
  it('fans out one stream per linked persona into side-by-side slots', async () => {
    postChatStreamMock.mockImplementation(async (payload, onEvent) => {
      onEvent({ type: 'delta', text: `Hi from ${payload.personaId}` })
      onEvent({ type: 'done' })
    })

    const { container } = render(<AudionTargetGroupChatPanel targetGroup={targetGroup} />)
    expect(screen.getByLabelText('Target group chat')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'What frustrates you?' },
    })
    fireEvent.click(screen.getByLabelText('Send to all personas'))

    await waitFor(() => {
      expect(postChatStreamMock).toHaveBeenCalledTimes(2)
    })
    expect(postChatStreamMock.mock.calls.map((c) => c[0].personaId).sort()).toEqual([
      'persona-a',
      'persona-b',
    ])

    await waitFor(() => {
      expect(screen.getByText('Hi from persona-a')).toBeInTheDocument()
      expect(screen.getByText('Hi from persona-b')).toBeInTheDocument()
    })
    expect(container.querySelectorAll('.audion-tg-chat-slot')).toHaveLength(2)
    expect(screen.getByText('What frustrates you?')).toBeInTheDocument()
  })
})

describe('AudionProjectChatPanel', () => {
  it('fans out only to personas of the selected project', async () => {
    postChatStreamMock.mockImplementation(async (payload, onEvent) => {
      onEvent({ type: 'delta', text: `Hi from ${payload.personaId}` })
      onEvent({ type: 'done' })
    })

    const { container } = render(
      <AudionProjectChatPanel
        projectId="proj-audion-core"
        projectName="Audion Core"
        personas={projectPersonas}
      />,
    )
    expect(screen.getByLabelText('Project chat')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'What blocks the purchase?' },
    })
    fireEvent.click(screen.getByLabelText('Send to all personas'))

    await waitFor(() => {
      expect(postChatStreamMock).toHaveBeenCalledTimes(2)
    })
    expect(postChatStreamMock.mock.calls.map((c) => c[0].personaId).sort()).toEqual([
      'persona-a',
      'persona-b',
    ])
    expect(postChatStreamMock.mock.calls.every((c) => c[0].projectId === 'proj-audion-core')).toBe(
      true,
    )

    await waitFor(() => {
      expect(screen.getByText('Hi from persona-a')).toBeInTheDocument()
      expect(screen.getByText('Hi from persona-b')).toBeInTheDocument()
    })
    expect(container.querySelectorAll('.audion-tg-chat-slot')).toHaveLength(2)
  })
})

describe('AudionChatWorkspace TG mode', () => {
  it('opens Zielgruppe mode from targetGroupId and hides persona chrome', () => {
    const { container } = render(
      <AudionChatWorkspace
        personas={[]}
        initialPersonaId={null}
        initialConversation={null}
        targetGroups={tgSummaries}
        initialTargetGroup={targetGroup}
        initialMode="target_group"
      />,
    )
    expect(screen.getByRole('heading', { name: 'Target group chat', hidden: true })).toBeInTheDocument()
    expect(container.querySelector('#chat-mode')).toBeTruthy()
    expect(container.querySelector('#chat-target-group')).toBeTruthy()
    expect(container.querySelector('#chat-persona')).toBeNull()
    expect(container.querySelector('#chat-project')).toBeNull()
    expect(screen.getByLabelText('Target group chat')).toBeInTheDocument()
    expect(container.querySelector('.audion-tg-chat-count')?.textContent).toMatch(/2 personas/i)
  })
})

describe('AudionChatWorkspace project mode', () => {
  it('opens project ask-all from projectId and hides persona chrome', () => {
    const { container } = render(
      <AudionChatWorkspace
        personas={projectPersonas}
        initialPersonaId={null}
        initialConversation={null}
        projects={projects}
        initialProjectId="proj-audion-core"
        initialMode="project"
      />,
    )
    expect(screen.getByRole('heading', { name: 'Project chat', hidden: true })).toBeInTheDocument()
    expect(container.querySelector('#chat-mode')).toBeTruthy()
    expect(container.querySelector('#chat-project')).toBeTruthy()
    expect(container.querySelector('#chat-persona')).toBeNull()
    expect(container.querySelector('#chat-target-group')).toBeNull()
    expect(screen.getByLabelText('Project chat')).toBeInTheDocument()
    expect(container.querySelector('.audion-tg-chat-count')?.textContent).toMatch(/2 personas/i)
  })
})
