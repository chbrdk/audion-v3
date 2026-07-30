/** Wave-1 stubs + Wave-2 live persona-api / chat-api proxy. */

export type AiWorkflowId =
  | 'generatePersonas'
  | 'generatePersonaAvatar'
  | 'suggestPersonaField'
  | 'enrichPersona'
  | 'generateMoodboard'
  | 'suggestTargetGroups'
  | 'suggestPersonas'
  | 'researchStart'
  | 'generateJourney'
  | 'generateJourneyFromProject'
  | 'generateJourneyPhaseMoments'
  | 'validateJourney'

export type AiTargetCall = {
  method: 'POST'
  /** Upstream V2 persona-api or chat-api path. */
  path: string
  body: Record<string, unknown>
}

export type AiStubMeta = {
  /** true = fixture stub; false = live upstream proxy */
  stubbed: boolean
  workflowId: AiWorkflowId
  target: AiTargetCall
}

export type AiSuggestionItem = {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
}

export type GeneratePersonasRequest = {
  segment?: string
  description?: string | null
  filter_mode?: 'auto' | string
  count?: number
  output_locale?: string
}

export type GeneratePersonasResponse = AiStubMeta & {
  personas: Array<{ id: string; name: string; role: string }>
}

export type SuggestTargetGroupsRequest = {
  max_suggestions?: number
  output_locale?: string
  bilingual?: boolean
}

export type SuggestTargetGroupsResponse = AiStubMeta & {
  suggestions: AiSuggestionItem[]
}

export type SuggestPersonasRequest = {
  target_group_id: string
  max_suggestions?: number
  output_locale?: string
}

export type SuggestPersonasResponse = AiStubMeta & {
  suggestions: AiSuggestionItem[]
}

export type ResearchStartRequest = {
  seed_url?: string
  max_pages?: number
  max_depth?: number
}

export type ResearchStartResponse = AiStubMeta & {
  jobId: string
  status: 'queued' | 'running' | 'idle'
}

export type ResearchRunStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type ResearchProgressEventType =
  | 'run_queued'
  | 'run_started'
  | 'crawl_start'
  | 'page_fetched'
  | 'crawl_done'
  | 'synthesize_start'
  | 'synthesize_done'
  | 'translate_start'
  | 'translate_done'
  | 'summary_saved'
  | 'run_failed'

export type ResearchProgressEvent = {
  id: string
  eventType: ResearchProgressEventType
  message: string
  createdAt: string
  payload?: Record<string, unknown>
}

export type ResearchStatusResponse = {
  stubbed: boolean
  projectId: string
  runId: string
  status: ResearchRunStatus
  events: ResearchProgressEvent[]
  error?: string | null
}

export type ResearchSummaryClaim = {
  text: string
  citations: string[]
}

export type ResearchSummarySection = {
  key: string
  title: string
  claims: ResearchSummaryClaim[]
}

export type ResearchLatestResponse = {
  stubbed: boolean
  projectId: string
  runId: string | null
  status: ResearchRunStatus | 'missing'
  summaryEn: ResearchSummarySection[] | null
  raw: Record<string, unknown> | null
}

export type GenerateJourneyRequest = {
  target_group_id?: string | null
  journey_type?: string
  organization_id?: string
  project_id?: string | null
  output_locale?: string
  use_async?: boolean
}

export type GenerateJourneyResponse = AiStubMeta & {
  journey: {
    id: string
    name: string
    phaseCount: number
  }
}

export type GeneratePersonaAvatarRequest = {
  /** Optional style hint for upstream image generate. */
  style?: string | null
}

export type GeneratePersonaAvatarResponse = AiStubMeta & {
  avatarUrl: string
}

/** Magazine field chips — Wave-1 suggest / V2 enrich & ai-assist. */
export type PersonaSuggestField =
  | 'interests'
  | 'values'
  | 'goals'
  | 'frustrations'
  | 'traits'
  | 'vocabulary'
  | 'sentenceStructure'

export type SuggestPersonaFieldRequest = {
  field: PersonaSuggestField
  max_suggestions?: number
  output_locale?: string
}

export type SuggestPersonaFieldResponse = AiStubMeta & {
  field: PersonaSuggestField
  suggestions: AiSuggestionItem[]
}

export type EnrichPersonaRequest = {
  output_locale?: string
  profile_overlay?: {
    bio?: string | null
    age?: string | null
    location?: string | null
    gender?: string | null
  }
}

export type EnrichPersonaResponse = AiStubMeta & {
  personaId: string
  facetsUpdated: string[]
  interests: string[]
  values: string[]
  goals: Array<{ label: string; priority: number }>
  frustrations: Array<{ label: string; evidenceCount: number }>
  traits: Record<string, number>
}

export type GenerateMoodboardRequest = {
  title?: string | null
}

export type GenerateMoodboardResponse = AiStubMeta & {
  personaId: string
  moodboardId: string | null
  status: 'ready' | 'building' | 'stubbed'
  visuals: {
    styleKeywords: string[]
    tiles: Array<{ id: string; imageUrl: string; category: string; caption: string | null }>
  }
}

export type GenerateJourneyPhaseMomentsRequest = {
  phase_id: string
  max_suggestions?: number
  output_locale?: string
}

export type GenerateJourneyPhaseMomentsResponse = AiStubMeta & {
  journeyId: string
  phaseId: string
  applied: boolean
  moments: Array<{
    id: string
    kind: 'action' | 'thought' | 'feeling' | 'pain' | 'opportunity' | 'other'
    label: string
    order: number
  }>
}

export type ValidateJourneyRequest = {
  persona_ids: string[]
  mode?: 'automated' | 'chat' | 'both'
}

export type JourneyFrictionPoint = {
  description: string
  severity: 'low' | 'medium' | 'high'
  personaQuote?: string | null
}

export type JourneyPhaseValidation = {
  phaseId: string
  phaseName: string
  fitScore: number
  status: 'good' | 'warning' | 'critical'
  frictionPoints: JourneyFrictionPoint[]
  recommendations: string[]
}

export type ValidateJourneyResponse = AiStubMeta & {
  journeyId: string
  overallFitScore: number
  validatedAt: string
  personaId: string
  phases: JourneyPhaseValidation[]
}
