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

export type ChatMessageImage = {
  id: string
  /** Compressed data URL for UI history / vision resolve at send. */
  dataUrl: string
}

export type ChatMessageDocument = {
  id: string
  filename: string
  charCount: number
}

export type ChatMessage = {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string | null
  status: ChatMessageStatus
  /** User-turn image attachments (persona chat). */
  images?: ChatMessageImage[]
  /** User-turn DOCX chips (persona chat). */
  documents?: ChatMessageDocument[]
  /** User requested A/B compare on this turn (exactly two images). */
  abCompare?: boolean
}

export type ChatConversationDetail = ChatConversationSummary & {
  messages: ChatMessage[]
  /** Latest completed website inspect for this conversation (session restore). */
  inspect?: ChatConversationInspect | null
}

/** Persisted inspect dock snapshot (steps + convert meta). */
export type ChatPersonaPolicySnapshot = {
  dimensions?: Record<string, number> | null
  heuristics?: string[] | null
}

/** Compact journey scorecard surfaced in chat inspect (agent aggregate). */
export type ChatUxJourneyScorecard = {
  frictionScore?: number | null
  personaFitScore?: number | null
  topStrengths?: string[] | null
  topWeaknesses?: string[] | null
  totalObservations?: number | null
  quotes?: string[] | null
  [key: string]: unknown
}

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
  /** Soft persona policy derived during the inspect run. */
  personaPolicy?: ChatPersonaPolicySnapshot | null
  /** Journey-level UX scorecard when the agent produced one. */
  scorecard?: ChatUxJourneyScorecard | null
}

export type ChatSendPayload = {
  personaId: string
  message: string
  conversationId?: string | null
  projectId?: string | null
  journeyId?: string | null
  /** Guest embed session id (cookie fallback when third-party cookies blocked). */
  guestSessionId?: string | null
  /** Temp upload IDs from POST /api/chat/images/upload. */
  imageIds?: string[] | null
  /** Temp upload IDs from POST /api/chat/documents/upload. */
  documentIds?: string[] | null
  /** When true and exactly two imageIds, inject A/B compare system instruction. */
  abCompare?: boolean | null
}

/** Chat workspace scope — persona thread vs target-group ask-all. */
export type ChatMode = 'persona' | 'target_group'

export type ChatTargetGroupSlotStatus = 'pending' | 'streaming' | 'complete' | 'error'

/** One persona answer slot inside a TG ask-all round. */
export type ChatTargetGroupRoundSlot = {
  personaId: string
  personaName: string
  role: string
  content: string
  status: ChatTargetGroupSlotStatus
  error: string | null
}

/** One question → N persona slots (ephemeral UI; not a conversation row). */
export type ChatTargetGroupRound = {
  id: string
  question: string
  createdAt: string
  slots: ChatTargetGroupRoundSlot[]
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

/** Structured think-aloud bookkeeping from browser-use (internal only). */
export type ChatUxJourneyStepReasoningMeta = {
  evaluation_previous_goal?: string | null
  memory?: string | null
  next_goal?: string | null
}

/** Per-step affect (product think-aloud). */
export type ChatUxJourneyFeel = {
  label: string
  valence: -2 | -1 | 0 | 1 | 2
}

/** Product source of truth for classical think-aloud channels. */
export type ChatUxJourneyThinkAloud = {
  seen?: string | null
  think?: string | null
  priorKnow?: string | null
  learned?: string | null
  next?: string | null
  why?: string | null
  feel?: ChatUxJourneyFeel | null
}

/** Perception-in-the-Loop (spec: ux-journey-perception) — gates actions. */
export type ChatUxJourneyPerceptionNoticed = {
  what: string
  where?: string | null
  relevance?: 'high' | 'med' | 'low' | string | null
}

export type ChatUxJourneyPerception = {
  taskReminder?: string | null
  noticed?: ChatUxJourneyPerceptionNoticed[] | null
  ignoredGuess?: string | null
  think?: string | null
  clarity?: number | null
  feel?: ChatUxJourneyFeel | null
  confusion?: string | null
  stance?: 'proceed' | 'hesitate' | 'abandon' | string | null
  intent?: string | null
  why?: string | null
  salienceBudget?: number | null
  noticedUsed?: number | null
}

/** UX research observation flag (max 2 per step from agent). */
export type ChatUxJourneyObservation = {
  category: string
  polarity: number
  severity: 'low' | 'medium' | 'high'
  note: string
  fix?: string | null
}

/** One browser-agent step surfaced in chat (live + completed). */
export type ChatUxJourneyStep = {
  step?: number
  action?: string
  target?: string
  result?: string
  /** Cleaned voice-over (blocks stripped) */
  reasoning?: string
  /** Browser-use bookkeeping — not primary UI labels */
  reasoningMeta?: ChatUxJourneyStepReasoningMeta | null
  /** Product think-aloud channels (spec: ux-journey-think-aloud) */
  thinkAloud?: ChatUxJourneyThinkAloud | null
  /** Perception-in-the-Loop (spec: ux-journey-perception) */
  perception?: ChatUxJourneyPerception | null
  /** Research flags for expanded step UI + scorecard */
  observations?: ChatUxJourneyObservation[] | null
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
  /** Full UX-journey agent task (includes browse/find goal from chat). */
  agentTask?: string | null
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
  /** Soft persona policy from the agent run (dims + heuristics). */
  personaPolicy?: ChatPersonaPolicySnapshot | null
  /** Journey-level UX scorecard when present. */
  scorecard?: ChatUxJourneyScorecard | null
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
  /** Echo from tool_proposed so approve survives stateless BFF instances. */
  agentTask?: string | null
}

export type ChatStreamDeltaEvent = { type: 'delta'; text: string }
import type { KnowledgeRagSource } from './knowledge-rag'

export type ChatStreamDoneEvent = {
  type: 'done'
  conversationId: string
  messageId?: string
  /** Project RAG sources used for this turn (optional). */
  sources?: KnowledgeRagSource[]
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
  conversationId: string | null
  personaId: string
}
