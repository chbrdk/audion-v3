import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatStreamEvent, PersonaSummary } from '@audion-v3/contracts'
import { AudionChatPanel } from '../components/audion-chat-panel'
import { ChatMoodboardStrip } from '../components/chat-moodboard-strip'
import { buildChatShareHref, extractUrlFromMessage } from '../lib/chat/share'
import {
  maybeProposeInspectWebsite,
  resetChatToolStore,
  storeChatToolDecisionStream,
  storeShareMoodboard,
  storeSharePersona,
} from '../lib/fixtures/chat-share'
import { resetChatStore, storeChatFakeStream } from '../lib/fixtures/chat-store'
import { runStubConvertUxRunToJourney } from '../lib/journey-from-ux-run'
import { resetJourneyStore } from '../lib/fixtures/journey-store'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/chat',
}))

vi.mock('../lib/chat/stream-client', () => ({
  postChatStream: vi.fn(),
}))

import { postChatStream } from '../lib/chat/stream-client'

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

afterEach(() => {
  cleanup()
  resetChatStore()
  resetChatToolStore()
  resetJourneyStore()
  vi.mocked(postChatStream).mockReset()
})

describe('chat modality API route import depths', () => {
  it('resolves lib modules from nested chat API routes', async () => {
    const { existsSync } = await import('node:fs')
    const { dirname, resolve } = await import('node:path')
    const root = process.cwd()
    const cases: Array<[string, string]> = [
      ['app/api/chat/tavus/session/route.ts', '../../../../../lib/persona-api-proxy.ts'],
      ['app/api/chat/voice/stream/route.ts', '../../../../../lib/runtime-config.ts'],
      [
        'app/api/chat/tool-call/decision/[callId]/route.ts',
        '../../../../../../lib/fixtures/chat-share.ts',
      ],
    ]
    for (const [file, rel] of cases) {
      const target = resolve(root, dirname(file), rel)
      expect(existsSync(target), `${file} → ${rel}`).toBe(true)
    }
  })
})

describe('chat share helpers', () => {
  it('builds share URL from persona + project', () => {
    expect(
      buildChatShareHref({
        personaId: 'persona-alex-morgan',
        projectId: 'proj-audion-core',
      }),
    ).toBe('/chat?personaId=persona-alex-morgan&projectId=proj-audion-core')
    expect(paths.routes.chatShare({ personaId: 'a', projectId: 'p' })).toContain('projectId=p')
  })

  it('extracts URLs from messages', () => {
    expect(extractUrlFromMessage('Look at https://example.com/path.')).toBe(
      'https://example.com/path',
    )
    expect(extractUrlFromMessage('no link here')).toBeNull()
  })
})

describe('chat share fixtures', () => {
  it('returns public persona and moodboard for matching project', () => {
    const persona = storeSharePersona('persona-alex-morgan', 'proj-audion-core')
    expect('error' in persona).toBe(false)
    if ('error' in persona) return
    expect(persona.name).toBe('Alex Morgan')

    const board = storeShareMoodboard('persona-alex-morgan', 'proj-audion-core')
    expect('error' in board).toBe(false)
    if ('error' in board) return
    expect(board.tiles.length).toBeGreaterThan(0)
  })

  it('rejects mismatched share token', () => {
    expect(storeSharePersona('persona-alex-morgan', 'proj-other')).toMatchObject({
      status: 403,
    })
  })
})

describe('inspect_website fixture stream + decision', () => {
  it('proposes inspect_website when message contains a URL', () => {
    const events = [
      ...storeChatFakeStream({
        personaId: 'persona-alex-morgan',
        message: 'Please review https://example.com/landing',
        projectId: 'proj-audion-core',
      }),
    ]
    expect(events.some((e) => e.type === 'tool_proposed')).toBe(true)
    expect(events.some((e) => e.type === 'done')).toBe(true)
    const proposed = events.find((e) => e.type === 'tool_proposed')
    expect(proposed && proposed.type === 'tool_proposed' && proposed.tool).toBe('inspect_website')
  })

  it('approve decision yields progress and convert payload', () => {
    const proposal = maybeProposeInspectWebsite(
      'https://example.com',
      'persona-alex-morgan',
      'proj-audion-core',
      'chat-1',
    )
    expect(proposal).toBeTruthy()
    const events = [...storeChatToolDecisionStream(proposal!.callId, { decision: 'approve' })]
    expect(events.some((e) => e.type === 'tool_started')).toBe(true)
    expect(events.some((e) => e.type === 'tool_complete')).toBe(true)
    const complete = events.find((e) => e.type === 'tool_complete')
    expect(complete && complete.type === 'tool_complete' && complete.convert?.source).toBe(
      'chat_inspect',
    )
  })

  it('deny decision yields tool_denied', () => {
    const proposal = maybeProposeInspectWebsite(
      'https://example.com',
      'persona-alex-morgan',
      null,
      null,
    )!
    const events = [...storeChatToolDecisionStream(proposal.callId, { decision: 'deny' })]
    expect(events).toEqual([
      expect.objectContaining({ type: 'tool_denied', callId: proposal.callId }),
    ])
  })
})

describe('chat_inspect convert stub', () => {
  it('creates a journey without study wave context', () => {
    const result = runStubConvertUxRunToJourney({
      source: 'chat_inspect',
      jobId: 'chat-inspect-abc',
      personaId: 'persona-alex-morgan',
      url: 'https://example.com',
      task: 'Inspect https://example.com',
      projectId: 'proj-audion-core',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.journey.phaseCount).toBe(3)
    expect(result.journey.name).toContain('example.com')
  })
})

describe('chat share + history flyouts', () => {
  it('builds conversation resume URLs', () => {
    expect(
      paths.routes.chatConversation({
        conversationId: 'chat-alex-intro',
        personaId: 'persona-alex-morgan',
      }),
    ).toBe('/chat?conversationId=chat-alex-intro&personaId=persona-alex-morgan')
  })
})

describe('chat moodboard strip', () => {
  it('hides tiles behind a flyover trigger', () => {
    render(
      <ChatMoodboardStrip
        personaId="persona-alex-morgan"
        projectId="proj-audion-core"
        tiles={[
          {
            id: 't1',
            imageUrl: '/fixtures/personas/persona-alex-morgan.png',
            category: 'look',
            caption: 'Calm desk',
          },
        ]}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Moodboard' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Calm desk')).toBeNull()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Moodboard' })).toBeInTheDocument()
    expect(screen.getByText('Calm desk')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Calm desk' })).toHaveAttribute(
      'src',
      '/fixtures/personas/persona-alex-morgan.png',
    )
  })
})

describe('audion chat panel tool HITL', () => {
  it('renders approve/deny and posts decision on approve', async () => {
    const proposed: ChatStreamEvent = {
      type: 'tool_proposed',
      callId: 'tool-hitl-1',
      tool: 'inspect_website',
      title: 'Inspect website',
      detail: 'Browse and summarize https://example.com',
      url: 'https://example.com',
    }

    vi.mocked(postChatStream).mockImplementation(async (_payload, onEvent) => {
      onEvent({ type: 'delta', text: 'Looking at that URL…' })
      onEvent(proposed)
      onEvent({
        type: 'done',
        conversationId: 'chat-hitl',
        messageId: 'm-asst-1',
      })
    })

    const ndjson = [
      JSON.stringify({
        type: 'tool_started',
        callId: 'tool-hitl-1',
        tool: 'inspect_website',
        message: 'Inspecting…',
      }),
      JSON.stringify({
        type: 'tool_complete',
        callId: 'tool-hitl-1',
        tool: 'inspect_website',
        summary: 'Stub inspection finished.',
        convert: {
          jobId: 'chat-inspect-tool-hitl-1',
          personaId: 'persona-alex-morgan',
          url: 'https://example.com',
          task: 'Inspect https://example.com',
          source: 'chat_inspect',
        },
      }),
      '',
    ].join('\n')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ndjson))
          controller.close()
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AudionChatPanel
        personas={personas}
        personaId="persona-alex-morgan"
        initialConversation={null}
      />,
    )

    fireEvent.change(screen.getByLabelText('Chat message'), {
      target: { value: 'Please review https://example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'Tool approval' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiChatToolDecision('tool-hitl-1'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Stub inspection finished.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Convert to journey' })).toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })
})
