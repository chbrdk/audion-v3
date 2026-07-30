export type ChatMessageRole = 'user' | 'assistant' | 'system'
export type ChatMessageStatus = 'complete' | 'streaming' | 'error'

export type ChatConversationSummary = {
  id: string
  personaId: string
  personaName: string | null
  projectId: string | null
  title: string | null
  updatedAt: string | null
  preview: string | null
}

export type ChatConversationList = {
  items: ChatConversationSummary[]
  total: number
}

export type ChatMessage = {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string | null
  status: ChatMessageStatus
}

export type ChatConversationDetail = ChatConversationSummary & {
  messages: ChatMessage[]
}

export type ChatSendPayload = {
  personaId: string
  message: string
  conversationId?: string | null
  projectId?: string | null
  journeyId?: string | null
}

export type ChatStreamDeltaEvent = { type: 'delta'; text: string }
export type ChatStreamDoneEvent = {
  type: 'done'
  conversationId: string
  messageId?: string
}
export type ChatStreamErrorEvent = { type: 'error'; message: string }
export type ChatStreamEvent =
  | ChatStreamDeltaEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent
