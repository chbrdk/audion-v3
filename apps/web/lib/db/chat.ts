import { desc, eq } from 'drizzle-orm'
import type {
  ChatConversationDetail,
  ChatConversationList,
  ChatConversationSummary,
  ChatMessage,
  ChatSendPayload,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { chatConversations, type ChatConversationRow } from './schema'
import { dbPersonaDetail } from './personas'

function rowToDetail(row: ChatConversationRow): ChatConversationDetail {
  return {
    id: row.id,
    personaId: row.personaId,
    personaName: row.personaName ?? null,
    projectId: row.projectId ?? null,
    title: row.title ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    preview: row.preview ?? null,
    messages: Array.isArray(row.messages) ? row.messages : [],
  }
}

function toSummary(c: ChatConversationDetail): ChatConversationSummary {
  const { messages: _m, ...summary } = c
  return summary
}

async function resolvePersonaName(personaId: string): Promise<string | null> {
  const persona = await dbPersonaDetail(personaId)
  return persona?.name ?? null
}

export async function dbChatConversationList(): Promise<ChatConversationList> {
  const db = getDb()
  const rows = await db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.updatedAt))
  const items = rows.map((row) => toSummary(rowToDetail(row)))
  return { items, total: items.length }
}

export async function dbChatConversationDetail(
  id: string,
): Promise<ChatConversationDetail | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1)
  const row = rows[0]
  return row ? rowToDetail(row) : null
}

export async function dbChatBeginUserTurn(
  payload: ChatSendPayload,
): Promise<{ conversationId: string; personaName: string | null } | { error: string }> {
  const message = payload.message.trim()
  if (!message) return { error: 'Message is required' }
  if (!payload.personaId.trim()) return { error: 'personaId is required' }

  const db = getDb()
  let conversation = payload.conversationId
    ? await dbChatConversationDetail(payload.conversationId)
    : null

  const personaName = await resolvePersonaName(payload.personaId)
  const now = new Date()
  const nowIso = now.toISOString()
  const userMsg: ChatMessage = {
    id: `m-user-${Date.now().toString(36)}`,
    role: 'user',
    content: message,
    createdAt: nowIso,
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
      updatedAt: nowIso,
      preview: message.slice(0, 80),
      messages: [userMsg],
    }
    await db.insert(chatConversations).values({
      id: conversation.id,
      personaId: conversation.personaId,
      personaName: conversation.personaName,
      projectId: conversation.projectId,
      title: conversation.title,
      preview: conversation.preview,
      messages: conversation.messages,
      updatedAt: now,
      createdAt: now,
    })
  } else {
    conversation = {
      ...conversation,
      messages: [...conversation.messages, userMsg],
      updatedAt: nowIso,
      preview: message.slice(0, 80),
      title: conversation.title || message.slice(0, 48),
    }
    await db
      .update(chatConversations)
      .set({
        messages: conversation.messages,
        updatedAt: now,
        preview: conversation.preview,
        title: conversation.title,
      })
      .where(eq(chatConversations.id, conversation.id))
  }

  return { conversationId: conversation.id, personaName }
}

export async function dbChatAppendAssistant(
  conversationId: string,
  content: string,
): Promise<{ conversationId: string; messageId: string }> {
  const assistantId = `m-asst-${Date.now().toString(36)}`
  const conversation = await dbChatConversationDetail(conversationId)
  if (!conversation) {
    return { conversationId, messageId: assistantId }
  }
  const now = new Date()
  const assistantMsg: ChatMessage = {
    id: assistantId,
    role: 'assistant',
    content,
    createdAt: now.toISOString(),
    status: 'complete',
  }
  const messages = [...conversation.messages, assistantMsg]
  const db = getDb()
  await db
    .update(chatConversations)
    .set({
      messages,
      updatedAt: now,
      preview: content.slice(0, 80),
    })
    .where(eq(chatConversations.id, conversationId))
  return { conversationId, messageId: assistantId }
}
