import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatStreamEvent, PersonaSummary } from '@audion-v3/contracts'
import { AudionChatPanel } from '../components/audion-chat-panel'
import { ChatMoodboardStrip } from '../components/chat-moodboard-strip'
import { buildChatShareHref, extractUrlFromMessage, extractInspectGoalFromMessage, buildInspectAgentTask } from '../lib/chat/share'
import {
  maybeProposeInspectWebsite,
  resetChatToolStore,
  storeChatToolDecisionStream,
  storeShareMoodboard,
  storeSharePersona,
} from '../lib/fixtures/chat-share'
import { resetChatStore, storeChatBeginUserTurn, storeChatConversationDetail, storeChatFakeStream } from '../lib/fixtures/chat-store'
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
      ['app/api/chat/tavus/session/route.ts', '../../../../../lib/tavus/client.ts'],
      ['app/api/chat/tavus/session/route.ts', '../../../../../lib/fixtures/persona-store.ts'],
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
  it('builds share URL from persona + project', async () => {
    expect(
      buildChatShareHref({
        personaId: 'persona-alex-morgan',
        projectId: 'proj-audion-core',
      }),
    ).toBe('/chat?personaId=persona-alex-morgan&projectId=proj-audion-core')
    expect(paths.routes.chatShare({ personaId: 'a', projectId: 'p' })).toContain('projectId=p')
  })

  it('extracts URLs from messages', async () => {
    expect(extractUrlFromMessage('Look at https://example.com/path.')).toBe(
      'https://example.com/path',
    )
    expect(extractUrlFromMessage('no link here')).toBeNull()
    expect(extractUrlFromMessage('schau dir msqdx.com an')).toBe('https://msqdx.com')
    expect(extractUrlFromMessage('www.msqdx.com/de')).toBe('https://www.msqdx.com/de')
    expect(extractUrlFromMessage('mail me at hello@msqdx.com please')).toBeNull()
    expect(maybeProposeInspectWebsite('msqdx.com', 'persona-alex-morgan', null, null)?.url).toBe(
      'https://msqdx.com',
    )
  })

  it('extracts inspect goal and builds agent task', () => {
    const message = 'suche auf https://www.moebel-martin.de/ nach Grillplatte'
    const url = 'https://www.moebel-martin.de/'
    expect(extractInspectGoalFromMessage(message, url)).toBe('suche nach Grillplatte')
    const task = buildInspectAgentTask(message, url)
    expect(task).toContain('Grillplatte')
    expect(task).toContain('Verfolge diese Aufgabe')
  })

  it('finds inspect goal from earlier chat turn when URL is in a later message', () => {
    const url = 'https://www.moebel-martin.de/'
    const task = buildInspectAgentTask('https://www.moebel-martin.de/', url, [
      'Ich suche nach einer Grillplatte für den Garten.',
      'Ok, schau mal auf moebel-martin.de',
    ])
    expect(task).toContain('Grillplatte')
    expect(task).toContain('Aufgabe:')
  })
})

describe('chat share fixtures', () => {
  it('returns public persona and moodboard for matching project', async () => {
    const persona = storeSharePersona('persona-alex-morgan', 'proj-audion-core')
    expect('error' in persona).toBe(false)
    if ('error' in persona) return
    expect(persona.name).toBe('Alex Morgan')

    const board = storeShareMoodboard('persona-alex-morgan', 'proj-audion-core')
    expect('error' in board).toBe(false)
    if ('error' in board) return
    expect(board.tiles.length).toBeGreaterThan(0)
  })

  it('rejects mismatched share token', async () => {
    expect(storeSharePersona('persona-alex-morgan', 'proj-other')).toMatchObject({
      status: 403,
    })
  })
})

describe('inspect_website fixture stream + decision', () => {
  it('proposes inspect_website when message contains a URL', async () => {
    const events = []
    for await (const event of storeChatFakeStream({
      personaId: 'persona-alex-morgan',
      message: 'Please review https://example.com/landing',
      projectId: 'proj-audion-core',
    })) {
      events.push(event)
    }
    expect(events.some((e) => e.type === 'tool_proposed')).toBe(true)
    expect(events.some((e) => e.type === 'done')).toBe(true)
    const proposed = events.find((e) => e.type === 'tool_proposed')
    expect(proposed && proposed.type === 'tool_proposed' && proposed.tool).toBe('inspect_website')
  })

  it('approve decision yields progress and convert payload', async () => {
    const proposal = maybeProposeInspectWebsite(
      'https://example.com',
      'persona-alex-morgan',
      'proj-audion-core',
      'chat-1',
    )
    expect(proposal).toBeTruthy()
    const events = []
    for await (const event of storeChatToolDecisionStream(proposal!.callId, {
      decision: 'approve',
    })) {
      events.push(event)
    }
    expect(events.some((e) => e.type === 'tool_started')).toBe(true)
    expect(events.some((e) => e.type === 'tool_complete')).toBe(true)
    const complete = events.find((e) => e.type === 'tool_complete')
    expect(complete && complete.type === 'tool_complete' && complete.convert?.source).toBe(
      'chat_inspect',
    )
  })

  it('deny decision yields tool_denied', async () => {
    const proposal = maybeProposeInspectWebsite(
      'https://example.com',
      'persona-alex-morgan',
      null,
      null,
    )!
    const events = []
    for await (const event of storeChatToolDecisionStream(proposal.callId, {
      decision: 'deny',
    })) {
      events.push(event)
    }
    expect(events).toEqual([
      expect.objectContaining({ type: 'tool_denied', callId: proposal.callId }),
    ])
  })

  it('approve persists inspect snapshot on the conversation', async () => {
    const begin = await storeChatBeginUserTurn({
      personaId: 'persona-alex-morgan',
      message: 'Please inspect https://example.com/persist',
      projectId: 'proj-audion-core',
    })
    expect('conversationId' in begin).toBe(true)
    if ('error' in begin) throw new Error(begin.error)

    const proposal = maybeProposeInspectWebsite(
      'https://example.com/persist',
      'persona-alex-morgan',
      'proj-audion-core',
      begin.conversationId,
    )!
    for await (const _ of storeChatToolDecisionStream(proposal.callId, { decision: 'approve' })) {
      /* drain */
    }

    const detail = await storeChatConversationDetail(begin.conversationId)
    expect(detail?.inspect?.steps?.length).toBeGreaterThan(0)
    expect(detail?.inspect?.convert?.source).toBe('chat_inspect')
    expect(detail?.inspect?.summary).toMatch(/Stub inspection/)
  })
})

describe('chat_inspect convert stub', () => {
  it('creates a journey without study wave context', async () => {
    const result = await runStubConvertUxRunToJourney({
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
  it('builds conversation resume URLs', async () => {
    expect(
      paths.routes.chatConversation({
        conversationId: 'chat-alex-intro',
        personaId: 'persona-alex-morgan',
      }),
    ).toBe('/chat?conversationId=chat-alex-intro&personaId=persona-alex-morgan')
  })
})

describe('chat moodboard strip', () => {
  it('hides tiles behind a flyover trigger', async () => {
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
