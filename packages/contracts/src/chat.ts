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
  /** Latest completed website inspect for this conversation (session restore). */
  inspect?: ChatConversationInspect | null
}

/** Persisted inspect dock snapshot (steps + convert meta). */
export type ChatConversationInspect = {
  jobId: string | null
  summary: string | null
  videoUrl: string | null
  steps: ChatUxJourneyStep[]
  stepsTotal: number | null
  convert: {
    jobId: string
    personaId: string
    url: string
    task: string
    source: 'chat_inspect'
  } | null
  completedAt: string | null
}

export type ChatSendPayload = {
  personaId: string
  message: string
  conversationId?: string | null
  projectId?: string | null
  journeyId?: string | null
}

export type ChatModality = 'text' | 'voice' | 'video'

export type ChatShareMoodboardTile = {
  id: string
  imageUrl: string
  category: string | null
  caption: string | null
}

export type ChatShareMoodboard = {
  personaId: string
  projectId: string | null
  styleKeywords: string[]
  tiles: ChatShareMoodboardTile[]
}

export type ChatSharePersona = {
  id: string
  name: string
  role: string
  projectId: string | null
  avatarUrl: string | null
  bio: string | null
}

export type ChatToolName = 'inspect_website'

/** Structured think-aloud bookkeeping from browser-use (V2 reasoningMeta). */
export type ChatUxJourneyStepReasoningMeta = {
  evaluation_previous_goal?: string | null
  memory?: string | null
  next_goal?: string | null
}

/** One browser-agent step surfaced in chat (live + completed). */
export type ChatUxJourneyStep = {
  step?: number
  action?: string
  target?: string
  result?: string
  /** Think-aloud / Denken */
  reasoning?: string
  reasoningMeta?: ChatUxJourneyStepReasoningMeta | null
  /** data: URL or absolute/relative path */
  screenshot?: string | null
  /** Agent-relative `/run/{jobId}/step/{n}/screenshot` or BFF path */
  screenshotUrl?: string | null
  timestamp?: string
}

export type ChatToolProposedEvent = {
  type: 'tool_proposed'
  callId: string
  tool: ChatToolName
  title: string
  detail: string
  url?: string | null
}

export type ChatToolStartedEvent = {
  type: 'tool_started'
  callId: string
  tool: ChatToolName
  message: string
  jobId?: string | null
}

export type ChatToolProgressEvent = {
  type: 'tool_progress'
  callId: string
  tool: ChatToolName
  message: string
  jobId?: string | null
  stepCount?: number | null
  stepsTotal?: number | null
  status?: 'running' | 'complete' | 'error' | string
  steps?: ChatUxJourneyStep[]
}

export type ChatToolCompleteEvent = {
  type: 'tool_complete'
  callId: string
  tool: ChatToolName
  summary: string
  /** Payload for Convert → journey (fixture or live job id). */
  convert: {
    jobId: string
    personaId: string
    url: string
    task: string
    source: 'chat_inspect'
  } | null
  jobId?: string | null
  videoUrl?: string | null
  steps?: ChatUxJourneyStep[]
  stepsTotal?: number | null
}

export type ChatToolDeniedEvent = {
  type: 'tool_denied'
  callId: string
  tool: ChatToolName
  message: string
}

export type ChatToolDecisionPayload = {
  decision: 'approve' | 'deny'
  conversationId?: string | null
  personaId?: string | null
  projectId?: string | null
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
  | ChatToolProposedEvent
  | ChatToolStartedEvent
  | ChatToolProgressEvent
  | ChatToolCompleteEvent
  | ChatToolDeniedEvent

export type ChatTavusSessionResponse = {
  stubbed: boolean
  conversationUrl: string
  meetingToken: string | null
  personaId: string
}
