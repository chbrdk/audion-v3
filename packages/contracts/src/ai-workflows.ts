/** Wave-1 AI workflow contracts — stubbed now; live persona-api proxy later. */

export type AiWorkflowId =
  | 'generatePersonas'
  | 'generatePersonaAvatar'
  | 'suggestPersonaField'
  | 'suggestTargetGroups'
  | 'suggestPersonas'
  | 'researchStart'
  | 'generateJourney'
  | 'generateJourneyFromProject'

export type AiTargetCall = {
  method: 'POST'
  /** Upstream V2 / persona-api path (not yet proxied). */
  path: string
  body: Record<string, unknown>
}

export type AiStubMeta = {
  stubbed: true
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
