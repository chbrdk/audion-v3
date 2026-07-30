/** Settings Admin hub — providers status + assist prompt test. */

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
  json: boolean
}

export type SettingsAssistTemplatesResponse = {
  templates: SettingsAssistTemplateSummary[]
}

export type SettingsAssistPromptTestRequest = {
  templateId: string
  locale?: string | null
  context?: string | null
  persona_profile?: string | null
  max_items?: string | null
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
