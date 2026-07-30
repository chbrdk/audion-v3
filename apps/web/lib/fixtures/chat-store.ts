import type {
  ChatConversationDetail,
  ChatConversationList,
  ChatConversationSummary,
  ChatMessage,
  ChatSendPayload,
  ChatStreamEvent,
} from '@audion-v3/contracts'
import { DEMO_PERSONAS } from './personas'
import { maybeProposeInspectWebsite } from './chat-share'

type StoredConversation = ChatConversationDetail

const seedPersona = DEMO_PERSONAS[0]!

let conversations: StoredConversation[] = [
  {
    id: 'chat-alex-intro',
    personaId: seedPersona.id,
    personaName: seedPersona.name,
    projectId: seedPersona.projectId,
    title: 'Roadmap clarity',
    updatedAt: '2026-07-28T15:00:00.000Z',
    preview: 'I need living personas, not workshop PDFs.',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What slows your roadmap decisions most?',
        createdAt: '2026-07-28T14:58:00.000Z',
        status: 'complete',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          '## Evidence lag\n\nI wait on research that never lands in the sprint. **Living personas** help more than a workshop PDF.\n\n1. Park signals in one place\n2. Tie them to a decision\n3. Review in two weeks',
        createdAt: '2026-07-28T15:00:00.000Z',
        status: 'complete',
      },
    ],
  },
]

export function resetChatStore(): void {
  conversations = [
    {
      id: 'chat-alex-intro',
      personaId: seedPersona.id,
      personaName: seedPersona.name,
      projectId: seedPersona.projectId,
      title: 'Roadmap clarity',
      updatedAt: '2026-07-28T15:00:00.000Z',
      preview: 'I need living personas, not workshop PDFs.',
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'What slows your roadmap decisions most?',
          createdAt: '2026-07-28T14:58:00.000Z',
          status: 'complete',
        },
        {
          id: 'm2',
          role: 'assistant',
          content:
            '## Evidence lag\n\nI wait on research that never lands in the sprint. **Living personas** help more than a workshop PDF.\n\n1. Park signals in one place\n2. Tie them to a decision\n3. Review in two weeks',
          createdAt: '2026-07-28T15:00:00.000Z',
          status: 'complete',
        },
      ],
    },
  ]
}

function toSummary(c: StoredConversation): ChatConversationSummary {
  const { messages: _m, ...summary } = c
  return summary
}

export function storeChatConversationList(): ChatConversationList {
  const items = conversations.map(toSummary)
  return { items, total: items.length }
}

export function storeChatConversationDetail(id: string): ChatConversationDetail | null {
  return conversations.find((c) => c.id === id) ?? null
}

function resolvePersonaName(personaId: string): string | null {
  return DEMO_PERSONAS.find((p) => p.id === personaId)?.name ?? null
}

function fixtureReply(message: string, personaName: string | null, proposedTool: boolean): string {
  const who = personaName || 'this persona'
  if (proposedTool) {
    return `## From ${who}\n\nI can inspect that URL for journey signals. **Approve** the tool request below to continue.`
  }
  return `## From ${who}\n\nYou asked: *${message.trim()}*\n\nHere is a concise take grounded in the magazine brief:\n\n1. Keep decisions tied to evidence\n2. Prefer short loops over big decks\n3. Come back with one concrete next step`
}

/** Fake NDJSON stream for fixture mode. */
export function* storeChatFakeStream(payload: ChatSendPayload): Generator<ChatStreamEvent> {
  const message = payload.message.trim()
  if (!message) {
    yield { type: 'error', message: 'Message is required' }
    return
  }
  if (!payload.personaId.trim()) {
    yield { type: 'error', message: 'personaId is required' }
    return
  }

  let conversation = payload.conversationId
    ? conversations.find((c) => c.id === payload.conversationId)
    : undefined

  const personaName = resolvePersonaName(payload.personaId)
  const now = new Date().toISOString()
  const userMsg: ChatMessage = {
    id: `m-user-${Date.now().toString(36)}`,
    role: 'user',
    content: message,
    createdAt: now,
    status: 'complete',
  }

  if (!conversation) {
    const id = `chat-${payload.personaId}-${Date.now().toString(36)}`
    conversation = {
      id,
      personaId: payload.personaId,
      personaName,
      projectId: payload.projectId ?? null,
      title: message.slice(0, 48),
      updatedAt: now,
      preview: message.slice(0, 80),
      messages: [userMsg],
    }
    conversations = [conversation, ...conversations]
  } else {
    conversation = {
      ...conversation,
      messages: [...conversation.messages, userMsg],
      updatedAt: now,
      preview: message.slice(0, 80),
      title: conversation.title || message.slice(0, 48),
    }
    conversations = conversations.map((c) => (c.id === conversation!.id ? conversation! : c))
  }

  const proposal = maybeProposeInspectWebsite(
    message,
    payload.personaId,
    payload.projectId ?? null,
    conversation.id,
  )
  const reply = fixtureReply(message, personaName, Boolean(proposal))
  const chunks = reply.match(/.{1,24}/gs) || [reply]
  for (const chunk of chunks) {
    yield { type: 'delta', text: chunk }
  }

  if (proposal) {
    yield proposal
  }

  const assistantId = `m-asst-${Date.now().toString(36)}`
  const assistantMsg: ChatMessage = {
    id: assistantId,
    role: 'assistant',
    content: reply,
    createdAt: new Date().toISOString(),
    status: 'complete',
  }
  conversation = {
    ...conversation,
    messages: [...conversation.messages, assistantMsg],
    updatedAt: assistantMsg.createdAt,
    preview: reply.slice(0, 80),
  }
  conversations = conversations.map((c) => (c.id === conversation!.id ? conversation! : c))

  yield { type: 'done', conversationId: conversation.id, messageId: assistantId }
}
