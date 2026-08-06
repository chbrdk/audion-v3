import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TargetGroupDetail, TargetGroupSummary } from '@audion-v3/contracts'
import { AudionChatWorkspace } from '../components/audion-chat-workspace'
import { AudionTargetGroupChatPanel } from '../components/audion-target-group-chat-panel'
import {
  buildChatTargetGroupHref,
  createTgRound,
  MAX_TG_CHAT_PERSONAS,
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
    expect(screen.getByLabelText('Target group chat')).toBeInTheDocument()
    expect(container.querySelector('.audion-tg-chat-count')?.textContent).toMatch(/2 personas/i)
  })
})
