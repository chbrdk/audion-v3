/** Central path and shell configuration for AUDION v3 web app. */

import { buildChatHref, type ChatPrefillContext } from './chat/prefill'

export const paths = {
  railInsetRem: 1,
  railGapRem: 4,
  railWidthRem: 4.25,
  mainGutterRem: 2.5,
  railDockEdge: 'left' as const,
  railDockStorageKey: 'audion.v3.railDock',
  /** Communication band layout preview: quote | tone */
  commLayoutStorageKey: 'audion.v3.commLayout',
  /** TG linked personas layout: cards | list */
  tgLinkedPersonasLayoutKey: 'audion.v3.tgLinkedPersonasLayout',
  brandCornerRadiusPx: 32,
  devPort: 3006,
  personaBackendInternalUrl: 'http://api:8000',
  /** Default local mode: try API, then demo fixtures */
  personaDataSource: 'auto' as const,
  personaFixturesPath: 'apps/web/lib/fixtures/personas.ts',
  personaStorePath: 'apps/web/lib/fixtures/persona-store.ts',
  targetGroupFixturesPath: 'apps/web/lib/fixtures/target-groups.ts',
  targetGroupStorePath: 'apps/web/lib/fixtures/target-group-store.ts',
  journeyFixturesPath: 'apps/web/lib/fixtures/journeys.ts',
  journeyStorePath: 'apps/web/lib/fixtures/journey-store.ts',
  projectFixturesPath: 'apps/web/lib/fixtures/projects.ts',
  projectStorePath: 'apps/web/lib/fixtures/project-store.ts',
  uxStudyFixturesPath: 'apps/web/lib/fixtures/ux-studies.ts',
  uxStudyStorePath: 'apps/web/lib/fixtures/ux-study-store.ts',
  /** Demo target for EBM Produktkombinationen (central key; resolve via backend/urls) */
  boschEbikeProduktkombinationenUrl:
    'https://www.bosch-ebike.com/de/service/produktkombinationen',
  boschEbikeHomeUrl: 'https://www.bosch-ebike.com/de/',
  audionMcpPlaygroundUrl: 'https://mcp-audion.projects-a.plygrnd.tech',
  /** Demo / public persona portraits under apps/web/public */
  personaAvatarBasePath: '/fixtures/personas',
  /** Demo moodboard / visual tiles under apps/web/public */
  personaVisualBasePath: '/fixtures/personas/visuals',
  /** Brand channel logos under apps/web/public */
  channelLogoBasePath: '/fixtures/channels',
  channelIconsPath: 'apps/web/lib/channel-icons.tsx',
  /** Default chat-api (override via env — never hardcode in components) */
  chatApiInternalUrl: 'http://chat-api:8001',
  defaultDisplayName: 'AUDION',
  displayNameStorageKey: 'audion.v3.displayName',
  themeStorageKey: 'audion.v3.theme',
  localeStorageKey: 'audion.v3.locale',
  defaultTheme: 'msqdx-dark' as const,
  defaultLocale: 'en' as const,
  themeChoices: ['msqdx', 'msqdx-dark', 'msqdx-v2', 'msqdx-v2-dark'] as const,
  localeChoices: ['en', 'de'] as const,
  routes: {
    home: '/',
    projects: '/projects',
    projectDetail: (id: string) => `/projects/${id}`,
    apiProjects: '/api/projects',
    apiProjectDetail: (id: string) => `/api/projects/${id}`,
    personas: '/personas',
    personaDetail: (id: string) => `/personas/${id}`,
    apiPersonas: '/api/personas',
    apiPersonaDetail: (id: string) => `/api/personas/${id}`,
    targetGroups: '/target-groups',
    targetGroupDetail: (id: string) => `/target-groups/${id}`,
    apiTargetGroups: '/api/target-groups',
    apiTargetGroupDetail: (id: string) => `/api/target-groups/${id}`,
    journeys: '/journeys',
    journeyDetail: (id: string) => `/journeys/${id}`,
    apiJourneys: '/api/journeys',
    apiJourneyDetail: (id: string) => `/api/journeys/${id}`,
    studies: '/studies',
    studyDetail: (id: string) => `/studies/${id}`,
    studyWaveDetail: (studyId: string, waveId: string) =>
      `/studies/${studyId}/waves/${waveId}`,
    apiStudies: '/api/studies',
    apiStudyDetail: (id: string) => `/api/studies/${id}`,
    apiStudyWaves: (studyId: string) => `/api/studies/${studyId}/waves`,
    apiStudyWaveDetail: (studyId: string, waveId: string) =>
      `/api/studies/${studyId}/waves/${waveId}`,
    apiStudyWaveEvaluate: (studyId: string, waveId: string) =>
      `/api/studies/${studyId}/waves/${waveId}/evaluate`,
    apiStudyWaveCompare: (studyId: string, waveId: string, otherWaveId: string) =>
      `/api/studies/${studyId}/waves/${waveId}/compare/${otherWaveId}`,
    apiStudyWaveStart: (studyId: string, waveId: string) =>
      `/api/studies/${studyId}/waves/${waveId}/start`,
    apiStudyWaveSync: (studyId: string, waveId: string) =>
      `/api/studies/${studyId}/waves/${waveId}/sync`,
    /**
     * Prefill chat — query contract: prompt, personaId, studyId, waveId,
     * projectId, studyName, waveKey (see lib/chat/prefill.ts).
     */
    chatWithContext: (ctx: ChatPrefillContext) => buildChatHref(ctx),
    /** Prompt-only deep-link; use chatWithContext when study/persona are known. */
    chatWithPrompt: (prompt: string) => buildChatHref({ prompt }),
    chat: '/chat',
    chatHistory: '/chat/history',
    apiChatStream: '/api/chat/stream',
    apiChatConversations: '/api/chat/conversations',
    apiChatConversationDetail: (id: string) => `/api/chat/conversations/${id}`,
    settings: '/settings',
    /** Wave-1 AI stubs — live persona-api proxy later (knowledge/ai-workflows.md) */
    apiAiGeneratePersonas: (tgId: string) =>
      `/api/ai/target-groups/${tgId}/personas/generate`,
    apiAiGeneratePersonaAvatar: (personaId: string) =>
      `/api/ai/personas/${personaId}/avatar/generate`,
    apiAiSuggestPersonaField: (personaId: string) =>
      `/api/ai/personas/${personaId}/suggest-field`,
    apiAiSuggestTargetGroups: (projectId: string) =>
      `/api/ai/projects/${projectId}/suggest-target-groups`,
    apiAiSuggestPersonas: (projectId: string) =>
      `/api/ai/projects/${projectId}/suggest-personas`,
    apiAiResearchStart: (projectId: string) =>
      `/api/ai/projects/${projectId}/research/start`,
    apiAiGenerateJourneyFromProject: (projectId: string) =>
      `/api/ai/projects/${projectId}/generate-journey`,
    apiAiGenerateJourney: '/api/ai/journeys/generate',
    apiAiOptions: '/api/ai/options',
  },
  envPersonaDataSource: 'NEXT_PERSONA_DATA_SOURCE',
  envPersonaBackendInternal: 'NEXT_PERSONA_BACKEND_INTERNAL_URL',
  envPersonaBackendPublic: 'NEXT_PUBLIC_PERSONA_BACKEND_URL',
  envChatApiInternal: 'NEXT_CHAT_API_INTERNAL_URL',
}

/** Resolve a persona portrait path from the central avatar base. */
export function personaAvatarPath(personaId: string): string {
  return `${paths.personaAvatarBasePath}/${personaId}.svg`
}

/** Resolve a persona visual / moodboard tile path from the central visuals base. */
export function personaVisualPath(slug: string): string {
  return `${paths.personaVisualBasePath}/${slug}.svg`
}
