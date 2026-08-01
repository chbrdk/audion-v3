import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersonaSummary } from '@audion-v3/contracts'
import { AudionChatPanel } from '../components/audion-chat-panel'
import { AudionChatWorkspace } from '../components/audion-chat-workspace'
import { paths } from '../lib/paths'

const postChatStreamMock = vi.fn()

vi.mock('../lib/chat/stream-client', () => ({
  postChatStream: (...args: unknown[]) => postChatStreamMock(...args),
}))

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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  postChatStreamMock.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        personaId: 'persona-alex-morgan',
        projectId: 'proj-audion-core',
        styleKeywords: [],
        tiles: [],
      }),
    }),
  )
})

const personas: PersonaSummary[] = [
  {
    id: 'persona-alex-morgan',
    name: 'Alex Morgan',
    role: 'Product Lead',
    projectId: 'proj-audion-core',
    status: 'ready',
    archetype: 'Builder',
    updatedAt: null,
    avatarUrl: null,
  },
]

describe('audion chat workspace', () => {
  it('puts persona + Share/History in the topbar and Voice/Video by the composer', () => {
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
    expect(topbar?.querySelector('#chat-modality')).toBeNull()
    expect(container.querySelector('.page-body .audion-chat-persona-field')).toBeNull()
    expect(screen.getByLabelText('Persona chat')).toBeInTheDocument()
    expect(container.querySelector('.ds-panel')).toBeNull()
    expect(container.querySelector('.chat-panel-open')).toBeTruthy()
    expect(container.querySelector('.chat-composer')).toBeTruthy()
    const form = container.querySelector('.chat-panel-open .chat-form')
    expect(form).toBeTruthy()
    expect(form?.classList.contains('is-expanded')).toBe(false)
    expect(form?.querySelector('.ds-field')).toBeTruthy()
    expect(form?.querySelector('.audion-chat-composer-actions')).toBeTruthy()
    expect(form?.querySelector('[aria-label="Share"]')).toBeNull()
    expect(form?.querySelector('[aria-label="History"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Voice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Video' })).toBeInTheDocument()
    expect(topbar?.querySelector('[aria-label="Share"]')).toBeTruthy()
    expect(topbar?.querySelector('[aria-label="History"]')).toBeTruthy()
    expect(topbar?.querySelector('a[aria-label="History"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByRole('dialog', { name: 'Share' })).toBeInTheDocument()
    expect(container.querySelector('.audion-chat-flyout-backdrop')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Share' }).className).toContain('ds-flyover')
    expect((screen.getByLabelText('Share link') as HTMLInputElement).value).toContain(
      'personaId=persona-alex-morgan&projectId=proj-audion-core',
    )
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByRole('dialog', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open full history/i })).toHaveAttribute(
      'href',
      paths.routes.chatHistory,
    )
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    expect(container.querySelector('.chat-send-icon')).toBeTruthy()
    expect(container.querySelector('.chat-send-icon .ds-btn__label')).toBeNull()
    expect(container.querySelector('.audion-page-lead')).toBeNull()
  })

  it('toggles voice modality via composer icon', () => {
    render(
      <AudionChatWorkspace
        personas={personas}
        initialPersonaId="persona-alex-morgan"
        initialConversation={null}
      />,
    )
    const voice = screen.getByRole('button', { name: 'Voice' })
    expect(voice).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(voice)
    expect(voice).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Voice mode stub/i)).toBeInTheDocument()
    fireEvent.click(voice)
    expect(voice).toHaveAttribute('aria-pressed', 'false')
  })

  it('locks share chrome when projectId share token is set', () => {
    render(
      <AudionChatWorkspace
        personas={personas}
        initialPersonaId="persona-alex-morgan"
        initialConversation={null}
        shareProjectId="proj-audion-core"
        moodboardTiles={[
          {
            id: 'tile-1',
            imageUrl: '/fixtures/personas/persona-alex-morgan.png',
            category: 'look',
            caption: 'Desk',
          },
        ]}
      />,
    )
    expect(screen.getByText('Public share')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'History' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'History' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Voice' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Shared chat', hidden: true })).toBeInTheDocument()
    const moodboardBtn = screen.getByRole('button', { name: 'Moodboard' })
    expect(moodboardBtn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog', { name: 'Moodboard' })).toBeNull()
    fireEvent.click(moodboardBtn)
    expect(moodboardBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Moodboard' })).toBeInTheDocument()
    expect(screen.getByText('Desk')).toBeInTheDocument()
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

  it('renders step follow-up bubbles with quiet meta + docks inspect outside turns', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.scrollTo = vi.fn() as never
    postChatStreamMock.mockImplementation(async (_payload, onEvent) => {
      onEvent({ type: 'delta', text: 'Noted.' })
      onEvent({
        type: 'tool_complete',
        callId: 'call-1',
        tool: 'inspect_website',
        summary: 'Inspection finished.',
        convert: null,
        jobId: 'job-1',
        steps: [{ step: 1, action: 'navigate', reasoning: 'Opening home' }],
        stepsTotal: 1,
      })
      onEvent({ type: 'done', conversationId: 'conv-inspect', messageId: 'm-asst-1' })
    })

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
          preview: 'hi',
          projectId: null,
          messages: [
            {
              id: 'm-step',
              role: 'user',
              content: 'About Step 03 · Click\nWas the CTA clear?',
              createdAt: '2026-07-29T00:00:00.000Z',
              status: 'complete',
            },
          ],
        }}
      />,
    )

    expect(container.querySelector('.audion-chat-user-step-meta')?.textContent).toContain(
      'About Step 03 · Click',
    )
    expect(container.querySelector('.chat-turn-user .chat-text')?.textContent).toBe(
      'Was the CTA clear?',
    )

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'inspect bosch' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByLabelText('UX journey inspect')
    const turns = container.querySelector('.chat-turns')
    const dock = container.querySelector('.ds-inspect-dock')
    expect(dock).toBeTruthy()
    expect(turns?.contains(dock)).toBe(true)
    expect(dock?.querySelector('.ds-step-strip')).toBeTruthy()
    expect(screen.getByText('Inspection finished.')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Step 01 · Navigate/i))
    expect(screen.getByRole('status')).toHaveTextContent(/Chatting about/)
    expect(screen.getByRole('status')).toHaveTextContent('Step 01 · Navigate')

    postChatStreamMock.mockImplementation(async (_payload, onEvent) => {
      onEvent({ type: 'delta', text: 'The CTA felt rushed.' })
      onEvent({ type: 'done', conversationId: 'conv-inspect', messageId: 'm-asst-2' })
    })
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'How did that feel?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const answer = await screen.findByText('The CTA felt rushed.')
    expect(container.querySelector('.ds-inspect-dock .ds-step-strip')).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent(/Chatting about/)
    const dockAfter = container.querySelector('.ds-inspect-dock')
    expect(dockAfter).toBeTruthy()
    expect(
      dockAfter!.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('restores inspect dock from conversation.inspect and renders step markdown', () => {
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.scrollTo = vi.fn() as never
    const { container } = render(
      <AudionChatPanel
        personas={personas}
        personaId="persona-alex-morgan"
        initialConversation={{
          id: 'conv-restore',
          personaId: 'persona-alex-morgan',
          personaName: 'Alex Morgan',
          title: 'Inspect restore',
          updatedAt: '2026-07-29T00:00:00.000Z',
          preview: 'done',
          projectId: null,
          messages: [
            {
              id: 'm1',
              role: 'user',
              content: 'https://example.com',
              createdAt: '2026-07-29T00:00:00.000Z',
              status: 'complete',
            },
          ],
          inspect: {
            jobId: 'job-restore',
            summary: 'Restored inspection finished.',
            videoUrl: null,
            steps: [
              {
                step: 1,
                action: 'navigate',
                reasoning: 'Opening **home** for friction.',
                reasoningMeta: {
                  memory: 'Remember *CTA* placement.',
                  next_goal: 'Click primary action',
                },
              },
            ],
            stepsTotal: 1,
            convert: {
              jobId: 'job-restore',
              personaId: 'persona-alex-morgan',
              url: 'https://example.com',
              task: 'Inspect',
              source: 'chat_inspect',
            },
            completedAt: '2026-07-29T00:05:00.000Z',
            personaPolicy: {
              dimensions: {
                detail_orientation: 0.88,
                trust_skepticism: 0.78,
              },
              heuristics: ['Prefer official nav', 'Verify claims'],
            },
          },
        }}
      />,
    )

    expect(screen.getByLabelText('UX journey inspect')).toBeTruthy()
    expect(screen.getByText('Restored inspection finished.')).toBeInTheDocument()
    expect(container.querySelector('.audion-ux-step-md .chat-answer strong')?.textContent).toBe(
      'home',
    )
    expect(container.querySelector('.audion-ux-step-md .chat-answer em')?.textContent).toBe('CTA')
    expect(container.querySelector('.audion-chat-persona-policy')?.textContent).toMatch(/Policy:/)
  })
})
