import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PersonaSummary } from '@audion-v3/contracts'
import { AudionChatPanel } from '../components/audion-chat-panel'
import { AudionChatWorkspace } from '../components/audion-chat-workspace'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/chat',
}))

vi.mock('../components/app-shell', () => ({
  AppShell: ({
    children,
    leading,
    actions,
    status,
  }: {
    children: React.ReactNode
    leading?: React.ReactNode
    actions?: React.ReactNode
    status?: React.ReactNode
  }) => (
    <div>
      <header className="topbar">
        <div className="topbar-brand">{leading}</div>
        <div className="topbar-right">
          {status}
          {actions}
        </div>
      </header>
      <div className="page-body">{children}</div>
    </div>
  ),
}))

afterEach(() => cleanup())

const personas: PersonaSummary[] = [
  {
    id: 'persona-alex-morgan',
    name: 'Alex Morgan',
    role: 'Product Lead',
    projectId: null,
    status: 'ready',
    archetype: 'Builder',
    updatedAt: null,
    avatarUrl: null,
  },
]

describe('audion chat workspace', () => {
  it('puts persona picker and history in the topbar', () => {
    const { container } = render(
      <AudionChatWorkspace
        personas={personas}
        initialPersonaId="persona-alex-morgan"
        initialConversation={null}
      />,
    )
    const topbar = container.querySelector('.topbar')
    expect(topbar).toBeTruthy()
    expect(topbar?.querySelector('.topbar-brand #chat-persona')).toBeTruthy()
    expect(topbar?.querySelector('.topbar-brand .audion-chat-persona-field')).toBeTruthy()
    expect(topbar?.querySelector('.ds-page-title')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Chat', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /History/i })).toHaveAttribute(
      'href',
      paths.routes.chatHistory,
    )
    expect(container.querySelector('.page-body .audion-chat-persona-field')).toBeNull()
    expect(container.querySelector('.page-body a.audion-link')).toBeNull()
    expect(screen.getByLabelText('Persona chat')).toBeInTheDocument()
    expect(container.querySelector('.ds-panel')).toBeNull()
    expect(container.querySelector('.chat-panel-open')).toBeTruthy()
    expect(container.querySelector('.chat-composer')).toBeTruthy()
    const form = container.querySelector('.chat-panel-open .chat-form')
    expect(form).toBeTruthy()
    expect(form?.classList.contains('is-expanded')).toBe(false)
    expect(form?.querySelector('.ds-field')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    expect(container.querySelector('.chat-send-icon')).toBeTruthy()
    expect(container.querySelector('.chat-send-icon .ds-btn__label')).toBeNull()
    expect(container.querySelector('.top-status')).toBeNull()
    expect(container.querySelector('.audion-page-lead')).toBeNull()
  })

  it('prefills composer from study F-Fragen deep-link draft', () => {
    render(
      <AudionChatWorkspace
        personas={personas}
        initialPersonaId="persona-alex-morgan"
        initialConversation={null}
        initialDraft="[UX Study · Study: EBM · Wave: wave-1]\n\nF2.1 Zweck?"
      />,
    )
    const composer = screen.getByLabelText('Message') as HTMLTextAreaElement
    expect(composer.value).toContain('Study: EBM')
    expect(composer.value).toContain('F2.1 Zweck?')
  })
})

describe('audion chat panel', () => {
  it('renders seeded turns with editorial turn classes', () => {
    const { container } = render(
      <AudionChatPanel
        personas={personas}
        personaId="persona-alex-morgan"
        initialConversation={{
          id: 'conv-1',
          personaId: 'persona-alex-morgan',
          personaName: 'Alex Morgan',
          title: 'Brief',
          updatedAt: '2026-07-29T00:00:00.000Z',
          preview: 'What should I lead with?',
          projectId: null,
          messages: [
            {
              id: 'm1',
              role: 'user',
              content: 'What should I lead with?',
              createdAt: '2026-07-29T00:00:00.000Z',
              status: 'complete',
            },
            {
              id: 'm2',
              role: 'assistant',
              content: 'Lead with the decision at stake.',
              createdAt: '2026-07-29T00:01:00.000Z',
              status: 'complete',
            },
          ],
        }}
      />,
    )
    expect(screen.getByText('What should I lead with?')).toBeInTheDocument()
    expect(screen.getByText('Lead with the decision at stake.')).toBeInTheDocument()
    expect(container.querySelector('.chat-panel-open')).toBeTruthy()
    expect(container.querySelector('.chat-turn-user .chat-text')).toBeTruthy()
    expect(container.querySelector('.chat-turn-assistant .chat-answer')).toBeTruthy()
    expect(container.querySelector('.chat-turn-user')).toBeTruthy()
    expect(container.querySelector('.chat-turn-assistant')).toBeTruthy()
  })
})
