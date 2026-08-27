/**
 * Chat conversation persistence facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 */
import type {
  ChatConversationDetail,
  ChatConversationInspect,
  ChatConversationList,
  ChatConversationSummary,
  ChatMessage,
  ChatSendPayload,
  ChatStreamEvent,
} from '@audion-v3/contracts'
import { isProjectsDatabaseConfigured } from '../db/config'
import { DEMO_PERSONAS } from './personas'
import { maybeProposeInspectWebsite } from './chat-share'

type StoredConversation = ChatConversationDetail

async function dbApi() {
  return import('../db/chat')
}

const seedPersona = DEMO_PERSONAS[0]!

function seedConversations(): StoredConversation[] {
  return [
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

let conversations: StoredConversation[] = seedConversations()

export function resetChatStore(): void {
  conversations = seedConversations()
}

function toSummary(c: StoredConversation): ChatConversationSummary {
  const { messages: _m, inspect: _i, ...summary } = c
  return summary
}

function resolvePersonaNameDemo(personaId: string): string | null {
  return DEMO_PERSONAS.find((p) => p.id === personaId)?.name ?? null
}

function fixtureReply(message: string, personaName: string | null, proposedTool: boolean): string {
  const who = personaName || 'this persona'
  if (proposedTool) {
    return `## From ${who}\n\nI can inspect that URL for journey signals. **Approve** the tool request below to continue.`
  }
  return `## From ${who}\n\nYou asked: *${message.trim()}*\n\nHere is a concise take grounded in the magazine brief:\n\n1. Keep decisions tied to evidence\n2. Prefer short loops over big decks\n3. Come back with one concrete next step`
}

function memoryChatConversationList(): ChatConversationList {
  const items = conversations.map(toSummary)
  return { items, total: items.length }
}

function memoryChatConversationDetail(id: string): ChatConversationDetail | null {
  return conversations.find((c) => c.id === id) ?? null
}

function memoryChatBeginUserTurn(
  payload: ChatSendPayload,
  opts?: {
    images?: { id: string; dataUrl: string }[]
    documents?: { id: string; filename: string; charCount: number }[]
    abCompare?: boolean
  },
): { conversationId: string; personaName: string | null } | { error: string } {
  const message = payload.message.trim()
  const images = opts?.images ?? []
  const documents = opts?.documents ?? []
  if (!message && images.length === 0 && documents.length === 0) {
    return { error: 'Message or attachment is required' }
  }
  if (!payload.personaId.trim()) return { error: 'personaId is required' }

  let conversation = payload.conversationId
    ? conversations.find((c) => c.id === payload.conversationId)
    : undefined

  const personaName = resolvePersonaNameDemo(payload.personaId)
  const now = new Date().toISOString()
  const content =
    message ||
    (images.length ? '(image attachment)' : documents.length ? '(document attachment)' : '')
  const userMsg: ChatMessage = {
    id: `m-user-${Date.now().toString(36)}`,
    role: 'user',
    content,
    createdAt: now,
    status: 'complete',
    ...(images.length
      ? {
          images,
          abCompare: Boolean(opts?.abCompare),
        }
      : {}),
    ...(documents.length ? { documents } : {}),
  }

  if (!conversation) {
    const id = `chat-${payload.personaId}-${Date.now().toString(36)}`
    conversation = {
      id,
      personaId: payload.personaId,
      personaName,
      projectId: payload.projectId ?? null,
      title: content.slice(0, 48),
      updatedAt: now,
      preview: content.slice(0, 80),
      messages: [userMsg],
      inspect: null,
    }
    conversations = [conversation, ...conversations]
  } else {
    conversation = {
      ...conversation,
      messages: [...conversation.messages, userMsg],
      updatedAt: now,
      preview: content.slice(0, 80),
      title: conversation.title || content.slice(0, 48),
    }
    conversations = conversations.map((c) => (c.id === conversation!.id ? conversation! : c))
  }

  return { conversationId: conversation.id, personaName }
}

function memoryChatAppendAssistant(
  conversationId: string,
  content: string,
): { conversationId: string; messageId: string } {
  const conversation = conversations.find((c) => c.id === conversationId)
  const assistantId = `m-asst-${Date.now().toString(36)}`
  if (!conversation) {
    return { conversationId, messageId: assistantId }
  }
  const assistantMsg: ChatMessage = {
    id: assistantId,
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
    status: 'complete',
  }
  const next = {
    ...conversation,
    messages: [...conversation.messages, assistantMsg],
    updatedAt: assistantMsg.createdAt,
    preview: content.slice(0, 80),
  }
  conversations = conversations.map((c) => (c.id === conversationId ? next : c))
  return { conversationId, messageId: assistantId }
}

function memoryChatSetInspect(
  conversationId: string,
  inspect: ChatConversationInspect | null,
): void {
  const conversation = conversations.find((c) => c.id === conversationId)
  if (!conversation) return
  const next: StoredConversation = {
    ...conversation,
    inspect,
    updatedAt: new Date().toISOString(),
  }
  conversations = conversations.map((c) => (c.id === conversationId ? next : c))
}

export async function storeChatConversationList(): Promise<ChatConversationList> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbChatConversationList()
  }
  return memoryChatConversationList()
}

export async function storeChatConversationDetail(
  id: string,
): Promise<ChatConversationDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbChatConversationDetail(id)
  }
  return memoryChatConversationDetail(id)
}

/** Persist user turn; shared by fixture + native chat. */
export async function storeChatBeginUserTurn(
  payload: ChatSendPayload,
  opts?: {
    images?: { id: string; dataUrl: string }[]
    documents?: { id: string; filename: string; charCount: number }[]
    abCompare?: boolean
  },
): Promise<{ conversationId: string; personaName: string | null } | { error: string }> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbChatBeginUserTurn(payload, opts)
  }
  return memoryChatBeginUserTurn(payload, opts)
}

export async function storeChatAppendAssistant(
  conversationId: string,
  content: string,
): Promise<{ conversationId: string; messageId: string }> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbChatAppendAssistant(conversationId, content)
  }
  return memoryChatAppendAssistant(conversationId, content)
}

export async function storeChatSetInspect(
  conversationId: string,
  inspect: ChatConversationInspect | null,
): Promise<void> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    await db.dbChatSetInspect(conversationId, inspect)
    return
  }
  memoryChatSetInspect(conversationId, inspect)
}

/** Fake NDJSON stream for stub AI runtime. */
export async function* storeChatFakeStream(
  payload: ChatSendPayload,
): AsyncGenerator<ChatStreamEvent> {
  const message = payload.message.trim()
  const imageIds = (payload.imageIds ?? []).map((id) => id.trim()).filter(Boolean)
  const documentIds = (payload.documentIds ?? []).map((id) => id.trim()).filter(Boolean)
  if (!message && imageIds.length === 0 && documentIds.length === 0) {
    yield { type: 'error', message: 'Message or attachment is required' }
    return
  }

  let images: { id: string; dataUrl: string }[] = []
  if (imageIds.length > 0) {
    const { resolveChatImages } = await import('../chat/image-upload-store')
    const resolved = await resolveChatImages(imageIds)
    if (!resolved.ok) {
      yield { type: 'error', message: resolved.error }
      return
    }
    images = resolved.images
  }

  let documents: Array<{ id: string; filename: string; charCount: number }> = []
  if (documentIds.length > 0) {
    const { resolveChatDocuments } = await import('../chat/document-upload-store')
    const resolved = await resolveChatDocuments(documentIds)
    if (!resolved.ok) {
      yield { type: 'error', message: resolved.error }
      return
    }
    documents = resolved.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      charCount: d.charCount,
    }))
  }

  const { shouldEnableAbCompare } = await import('../chat/ab-compare')
  const abCompare = shouldEnableAbCompare(payload.abCompare, images.length)
  const turnPayload: ChatSendPayload = {
    ...payload,
    message:
      message ||
      (images.length ? '(image attachment)' : documents.length ? '(document attachment)' : ''),
    imageIds,
    documentIds,
    abCompare,
  }

  const turn = await storeChatBeginUserTurn(turnPayload, { images, documents, abCompare })
  if ('error' in turn) {
    yield { type: 'error', message: turn.error }
    return
  }

  const proposal = maybeProposeInspectWebsite(
    message,
    payload.personaId,
    payload.projectId ?? null,
    turn.conversationId,
  )
  const reply = abCompare
    ? `## From ${turn.personaName || 'this persona'}\n\n### A summary\nVariant A looks clearer.\n\n### B summary\nVariant B is denser.\n\n### Key differences\nContrast and hierarchy.\n\n### Winner & why\n**A** — clearer scan path for the stated goal.\n\n### Recommendations\nKeep A's hierarchy; borrow B's accent sparingly.`
    : fixtureReply(
        message || (documents.length ? 'document' : 'image'),
        turn.personaName,
        Boolean(proposal),
      )
  const chunks = reply.match(/.{1,24}/gs) || [reply]
  for (const chunk of chunks) {
    yield { type: 'delta', text: chunk }
  }

  if (proposal) {
    yield proposal
  }

  const done = await storeChatAppendAssistant(turn.conversationId, reply)
  yield { type: 'done', conversationId: done.conversationId, messageId: done.messageId }
}
