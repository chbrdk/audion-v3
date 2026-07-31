import type { ChatConversationDetail, ChatConversationList } from '@audion-v3/contracts'
import {
  storeChatConversationDetail,
  storeChatConversationList,
} from '../fixtures/chat-store'

/** MVP: fixture / Postgres conversations (chat-api history proxy later). */
export async function fetchChatConversationList(): Promise<ChatConversationList> {
  return storeChatConversationList()
}

export async function fetchChatConversationDetail(
  id: string,
): Promise<ChatConversationDetail | null> {
  return storeChatConversationDetail(id)
}
