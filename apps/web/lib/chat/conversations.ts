import type { ChatConversationDetail, ChatConversationList } from '@audion-v3/contracts'
import {
  storeChatConversationDetail,
  storeChatConversationList,
} from '../fixtures/chat-store'

/** MVP: fixture conversations (chat-api history proxy later). */
export function fetchChatConversationList(): ChatConversationList {
  return storeChatConversationList()
}

export function fetchChatConversationDetail(id: string): ChatConversationDetail | null {
  return storeChatConversationDetail(id)
}
