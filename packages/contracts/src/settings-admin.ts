/** Settings Admin hub — providers status + assist prompt test / edit. */

export type SettingsProviderInfo = {
  id: string
  label: string
  model?: string | null
  configured: boolean
  detail?: string | null
}

export type SettingsProvidersResponse = {
  providers: SettingsProviderInfo[]
  defaultProvider: string
  aiRuntime: 'stub' | 'native' | 'auto'
  chatNative: boolean
  personaDataSource: string
  plexonConfigured: boolean
}

export type SettingsAssistTemplateSummary = {
  id: string
  label: string
  description: string
  category: string
  json: boolean
  overridden: boolean
  system: string
  user: string
  prompt: string
}

export type SettingsAssistTemplatesResponse = {
  templates: SettingsAssistTemplateSummary[]
}

export type SettingsAssistPromptUpdateRequest = {
  system?: string | null
  user?: string | null
  prompt?: string | null
}

export type SettingsAssistPromptTestRequest = {
  templateId: string
  locale?: string | null
  context?: string | null
  persona_profile?: string | null
  max_items?: string | null
  /** Extra ${var} values merged into the render context. */
  vars?: Record<string, string> | null
}

export type SettingsAssistPromptTestResponse = {
  stubbed: boolean
  templateId: string
  text: string
  json: unknown
  suggestions: Array<{
    id: string
    title: string
    subtitle?: string | null
    description?: string | null
  }>
}

/** API tokens — list never includes secrets. */
export type SettingsApiTokenSummary = {
  id: string
  name: string | null
  createdAt: string
}

export type SettingsApiTokenListResponse = {
  items: SettingsApiTokenSummary[]
}

export type SettingsApiTokenCreateRequest = {
  name?: string | null
}

export type SettingsApiTokenCreateResponse = SettingsApiTokenSummary & {
  /** Raw Bearer token — shown once. */
  token: string
}

export type SettingsApiTokenVerifyResponse = {
  ok: true
  ownerId: string
  tokenId: string
}
