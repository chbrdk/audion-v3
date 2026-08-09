/** Central path and shell configuration for AUDION v3 web app. */

import { buildChatHref, type ChatPrefillContext } from './chat/prefill'
import { buildChatTargetGroupHref } from './chat/tg-ask-all'
import {
  buildChatConversationHref,
  buildChatShareHref,
  type ChatConversationHrefParams,
  type ChatShareParams,
} from './chat/share'

export const paths = {
  railInsetRem: 1,
  railGapRem: 4,
  railWidthRem: 4.25,
  mainGutterRem: 2.5,
  railDockEdge: 'left' as const,
  railDockStorageKey: 'audion.v3.railDock',
  flowBoardToolbarDockKey: 'audion.flowBoard.toolbarDock',
  flowBoardPaletteDockKey: 'audion.flowBoard.paletteDock',
  flowBoardInspectorDockKey: 'audion.flowBoard.inspectorDock',
  flowBoardRunDockKey: 'audion.flowBoard.runDock',
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
  queueStorePath: 'apps/web/lib/fixtures/queue-store.ts',
  apiTokensStorePath: 'apps/web/lib/fixtures/api-tokens-store.ts',
  /** V2-compatible personal API token prefix (`audion_` + hex). */
  apiTokenPrefix: 'audion_',
  apiTokenBytes: 32,
  apiTokenFixtureOwnerId: 'local-admin',
  /**
   * Coolify / local env for machine Bearer access (MCP, seed scripts).
   * When set, middleware accepts this raw token for `/api/*` without a session.
   */
  audionApiTokenEnvKey: 'AUDION_API_TOKEN',
  /** Staging origin — see knowledge/deploy-urls.md (`URL_AUDION_V3`). */
  audionV3StagingOrigin: 'https://audion-v3.projects-a.plygrnd.tech',
  audionV3BaseUrlEnvKey: 'AUDION_V3_BASE_URL',
  uxStudyFixturesPath: 'apps/web/lib/fixtures/ux-studies.ts',
  uxStudyStorePath: 'apps/web/lib/fixtures/ux-study-store.ts',
  uxScenarioPacksPath: 'apps/web/lib/fixtures/scenario-packs',
  /** Fast B-only persona iteration pack — correlate via persona-lab-correlate.ts */
  personaLabPackId: 'pack-ebm-persona-lab-b',
  /** Logical fixture aliases (personas.ts); from-pack resolves to DB ids below. */
  personaLabImpatientPersonaId: 'persona-alex-lab-impatient',
  personaLabPatientPersonaId: 'persona-sam-lab-patient',
  /**
   * Staging Postgres lab personas (seeded). from-pack maps fixture aliases here
   * unless AUDION_LAB_*_PERSONA_ID overrides. No manual wave PATCH needed.
   */
  personaLabImpatientDbPersonaId: 'persona-alex-lab-ungeduldig-msdfje0b',
  personaLabPatientDbPersonaId: 'persona-sam-lab-geduldig-msdroy3t',
  envLabAlexPersonaId: 'AUDION_LAB_ALEX_PERSONA_ID',
  envLabSamPersonaId: 'AUDION_LAB_SAM_PERSONA_ID',
  labPersonaResolvePath: 'apps/web/lib/lab-persona-resolve.ts',
  labPersonaResolveKnowledgePath: 'knowledge/persona-lab-persona-resolve-2026-08-04.md',
  /** Micro-labs (not Lab B matrix) */
  personaLabNavPackId: 'pack-ebm-persona-lab-nav',
  personaLabPurchasePackId: 'pack-ebm-persona-lab-purchase',
  personaLabAcPackId: 'pack-ebm-persona-lab-ac',
  personaLabProduktnahPackId: 'pack-ebm-persona-lab-produktnah',
  personaLabNextStepPackId: 'pack-ebm-persona-lab-next-step',
  /** Non-Bosch findability template (example.org). */
  labTemplateFindabilityPackId: 'pack-lab-template-findability',
  personaLabMicroLabsKnowledgePath: 'knowledge/persona-lab-micro-labs-2026-08-04.md',
  uxLabArchetypesSpecPath: 'specs/domain/ux-lab-archetypes.md',
  uxTestFlowScenariosSpecPath: 'specs/domain/ux-test-flow-scenarios.md',
  uxTestFlowModelSpecPath: 'specs/domain/ux-test-flow-model.md',
  uxTestFlowsLibPath: 'apps/web/lib/ux-test-flows.ts',
  uxFlowStorePath: 'apps/web/lib/fixtures/ux-flow-store.ts',
  uxFlowDbPath: 'apps/web/lib/db/ux-saved-flows.ts',
  uxFlowReplanPath: 'apps/web/lib/ux-flow-replan.ts',
  uxFlowModeratedProtocolPath: 'apps/web/components/ux-flow-moderated-protocol.tsx',
  uxFlowHybridPath: 'apps/web/lib/ux-flow-hybrid.ts',
  uxFlowRunProgressPath: 'apps/web/lib/ux-flow-run-progress.ts',
  labArchetypeCorrelatePath: 'apps/web/lib/lab-archetype-correlate.ts',
  personaLabNavCorrelatePath: 'apps/web/lib/persona-lab-nav-correlate.ts',
  personaLabCorrelatePath: 'apps/web/lib/persona-lab-correlate.ts',
  personaLabKnowledgePath: 'knowledge/persona-iteration-lab-2026-08-03.md',
  personaLabTryThenQuitKnowledgePath: 'knowledge/lab-try-then-quit-2026-08-03.md',
  /**
   * Impatient floor for exploratory attempts before hard abandon.
   * Default **3** → Alex typically lands ~4–6 steps (navigate + tries + done).
   */
  envUxJourneyTryBeforeAbandon: 'UX_JOURNEY_TRY_BEFORE_ABANDON',
  uxJourneyTryBeforeAbandonDefault: 3,
  /** Soft-Q Think-Aloud draft (Lab L6) — empty keys filled on Evaluate */
  softQDraftPath: 'apps/web/lib/soft-q-draft.ts',
  softQDraftKnowledgePath: 'knowledge/lab-l6-soft-q-draft-2026-08-03.md',
  softQLlmAssistPath: 'apps/web/lib/soft-q-llm-assist.ts',
  softQLlmAssistKnowledgePath: 'knowledge/lab-l6b-soft-q-llm-assist-2026-08-03.md',
  /** Opt-in: Evaluate LLM Soft-Q assist (`1`/`true`). Default off in code; staging may enable. */
  envSoftQLlmAssist: 'AUDION_SOFT_Q_LLM_ASSIST',
  /** Perception-in-the-Loop (agent) */
  uxJourneyPerceptionPath: 'services/ux-journey-agent/perception.py',
  uxJourneyPerceptionSpecPath: 'specs/domain/ux-journey-perception.md',
  uxJourneyPerceptionKnowledgePath: 'knowledge/ux-journey-perception-in-loop.md',
  perceptionHumanGoldPath: 'knowledge/fixtures/perception-human-gold-b.json',
  /** Demo target for EBM Produktkombinationen (central key; resolve via backend/urls) */
  boschEbikeProduktkombinationenUrl:
    'https://www.bosch-ebike.com/de/service/produktkombinationen',
  boschEbikeHomeUrl: 'https://www.bosch-ebike.com/de/',
  boschEbikeHaendlersucheUrl: 'https://www.bosch-ebike.com/de/service/haendlersuche',
  boschEbikeHaendlersucheUrlKey: 'bosch.ebike.haendlersuche',
  /**
   * Non-product findability template start/target (IANA example domains — stable, no CloudFront).
   * @see pack-lab-template-findability
   */
  labTemplateFindabilityStartUrl: 'https://example.org/',
  labTemplateFindabilityTargetUrl: 'https://example.com/',
  labTemplateFindabilityStartUrlKey: 'lab.template.findability.start',
  labTemplateFindabilityTargetUrlKey: 'lab.template.findability.target',
  /** Official press release (accessible when CloudFront blocks bot UAs on bosch-ebike.com). */
  boschEbikePressHubMotorUrl:
    'https://www.bosch-presse.de/pressportal/de/de/das-warten-hat-sich-gelohnt-bosch-ebike-systems-bringt-ersten-nabenmotor-283392.html',
  audionMcpPlaygroundUrl: 'https://mcp-audion.projects-a.plygrnd.tech',
  /** Browser-like UA — CloudFront on bosch-ebike.com returns 403 for bare `node` / custom bot UAs. */
  researchCrawlUserAgent:
    'Mozilla/5.0 (compatible; AudionResearch/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  /**
   * Journey-agent Chromium UA (no HeadlessChrome). Keep in sync with
   * `services/ux-journey-agent/browser_ua.py` DEFAULT + env `UX_JOURNEY_USER_AGENT`.
   * @see knowledge/cloudfront-403-bosch-headless-ua-2026-08-03.md
   */
  uxJourneyBrowserUserAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  researchCrawlTimeoutMs: 15_000,
  researchCrawlMaxTextChars: 12_000,
  researchCrawlMaxPages: 3,
  /** Demo / public persona portraits under apps/web/public */
  personaAvatarBasePath: '/fixtures/personas',
  /** Demo moodboard / visual tiles under apps/web/public */
  personaVisualBasePath: '/fixtures/personas/visuals',
  /** Brand channel logos under apps/web/public */
  channelLogoBasePath: '/fixtures/channels',
  channelIconsPath: 'apps/web/lib/channel-icons.tsx',
  /** @deprecated V2 chat-api proxy — native AI uses OPENAI_* instead */
  chatApiInternalUrl: 'http://chat-api:8001',
  /** Native AI runtime: stub | native | auto (auto = native when OPENAI_API_KEY set) */
  aiRuntime: 'auto' as const,
  /** Cheap default for chat/assist — override via AI_OPENAI_MODEL */
  aiOpenAiModel: 'gpt-5.4-nano',
  /** UX Journey Agent OpenAI — Lab A/B 2026-08-03; override via UX_JOURNEY_OPENAI_MODEL */
  uxJourneyOpenAiModel: 'gpt-5.6-luna',
  aiOpenAiImageModel: 'gpt-image-1-mini',
  /** Easy Setup optional website fetch (SSRF-safe) — knowledge/easy-setup-2026.md */
  easySetupUrlFetchTimeoutMs: 20_000,
  easySetupUrlMaxResponseBytes: 2 * 1024 * 1024,
  easySetupUrlMaxTextChars: 16_000,
  easySetupUrlUserAgent:
    'Mozilla/5.0 (compatible; AudionEasySetup/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
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
    login: '/login',
    apiAuthNextAuth: '/api/auth',
    apiPlatformProvisioningUser: (id: string) =>
      `/api/platform/provisioning/users/${id}`,
    apiPlatformProvisioningProject: (id: string) =>
      `/api/platform/provisioning/projects/${id}`,
    projects: '/projects',
    projectDetail: (id: string) => `/projects/${id}`,
    /** Magazine Easy Setup — project + TG + persona bootstrap */
    setup: '/setup',
    apiProjects: '/api/projects',
    apiProjectsBootstrap: '/api/projects/bootstrap',
    apiProjectDetail: (id: string) => `/api/projects/${id}`,
    /** Register existing project on Plexon Collection (audion-project-origin). */
    apiProjectSyncPlexon: (id: string) => `/api/projects/${id}/sync-plexon`,
    personas: '/personas',
    personaDetail: (id: string) => `/personas/${id}`,
    apiPersonas: '/api/personas',
    apiPersonaDetail: (id: string) => `/api/personas/${id}`,
    targetGroups: '/target-groups',
    targetGroupDetail: (id: string) => `/target-groups/${id}`,
    apiTargetGroups: '/api/target-groups',
    apiTargetGroupDetail: (id: string) => `/api/target-groups/${id}`,
    /** PLEXON / FastAPI-compatible alias of `apiAiGeneratePersonas` (no `/ai` prefix). */
    apiTargetGroupPersonasGenerate: (tgId: string) =>
      `/api/target-groups/${tgId}/personas/generate`,
    journeys: '/journeys',
    journeyDetail: (id: string) => `/journeys/${id}`,
    apiJourneys: '/api/journeys',
    apiJourneyDetail: (id: string) => `/api/journeys/${id}`,
    apiJourneyFromUxRun: '/api/journeys/from-ux-run',
    studies: '/studies',
    studiesFlows: '/studies/flows',
    studiesFlowDetail: (flowId: string) => `/studies/flows/${flowId}`,
    studiesFlowProtocol: (flowId: string) => `/studies/flows/${flowId}?view=protocol`,
    studyDetail: (id: string) => `/studies/${id}`,
    studyWaveDetail: (studyId: string, waveId: string) =>
      `/studies/${studyId}/waves/${waveId}`,
    apiStudies: '/api/studies',
    apiStudiesFromPack: '/api/studies/from-pack',
    apiStudiesFromFlow: '/api/studies/from-flow',
    apiStudiesFlowsSaved: '/api/studies/flows/saved',
    apiStudiesFlowSavedDetail: (id: string) => `/api/studies/flows/saved/${id}`,
    apiStudiesFlowsHybridSegment: '/api/studies/flows/hybrid-segment',
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
    /** Target-group ask-all: /chat?targetGroupId= */
    chatTargetGroup: (targetGroupId: string) => buildChatTargetGroupHref(targetGroupId),
    /** Public share: /chat?personaId=&projectId= */
    chatShare: (params: ChatShareParams) => buildChatShareHref(params),
    /** Resume conversation: /chat?conversationId=&personaId= */
    chatConversation: (params: ChatConversationHrefParams) => buildChatConversationHref(params),
    apiChatStream: '/api/chat/stream',
    apiChatConversations: '/api/chat/conversations',
    apiChatConversationDetail: (id: string) => `/api/chat/conversations/${id}`,
    apiChatToolDecision: (callId: string) => `/api/chat/tool-call/decision/${callId}`,
    apiUxJourneyAgentRun: (jobId: string) => `/api/ux-journey-agent/run/${jobId}`,
    apiUxJourneyAgentLive: (jobId: string) => `/api/ux-journey-agent/run/${jobId}/live`,
    apiUxJourneyAgentLiveStream: (jobId: string) =>
      `/api/ux-journey-agent/run/${jobId}/live/stream`,
    apiUxJourneyAgentVideo: (jobId: string) => `/api/ux-journey-agent/run/${jobId}/video`,
    apiChatTavusSession: '/api/chat/tavus/session',
    apiChatVoiceStream: '/api/chat/voice/stream',
    /** Upstream persona-api / persona-admin Tavus session (live proxy). */
    upstreamPersonaAdminTavusSession: '/api/persona-admin/tavus/session',
    apiChatSharePersona: (personaId: string) => `/api/share/personas/${personaId}`,
    apiChatShareMoodboard: (personaId: string) => `/api/share/personas/${personaId}/moodboard`,
    settings: '/settings',
    settingsAdmin: '/settings/admin',
    settingsAdminProviders: '/settings/admin/providers',
    settingsAdminPrompts: '/settings/admin/prompts',
    settingsAdminApiDocs: '/settings/admin/api-docs',
    settingsAdminTokens: '/settings/admin/tokens',
    apiSettingsProviders: '/api/settings/providers',
    apiSettingsPrompts: '/api/settings/prompts',
    apiSettingsPromptDetail: (templateId: string) =>
      `/api/settings/prompts/${encodeURIComponent(templateId)}`,
    apiSettingsPromptTest: '/api/settings/prompts/test',
    apiSettingsPersonaPrompts: '/api/settings/persona-prompts',
    apiSettingsPersonaPromptDetail: (personaId: string) =>
      `/api/settings/persona-prompts/${encodeURIComponent(personaId)}`,
    apiSettingsTokens: '/api/settings/tokens',
    apiSettingsTokenDetail: (tokenId: string) =>
      `/api/settings/tokens/${encodeURIComponent(tokenId)}`,
    apiSettingsTokenVerify: '/api/settings/tokens/verify',
    queue: '/queue',
    apiQueueStats: '/api/queue/stats',
    apiQueueJobs: '/api/queue/jobs',
    apiQueueJobDetail: (id: string) => `/api/queue/jobs/${id}`,
    apiQueueJobRetry: (id: string) => `/api/queue/jobs/${id}/retry`,
    apiHealth: '/api/health',
    /** Wave-1 AI stubs / Wave-2 live proxy — see knowledge/ai-workflows.md */
    apiAiGeneratePersonas: (tgId: string) =>
      `/api/ai/target-groups/${tgId}/personas/generate`,
    apiAiGeneratePersonaAvatar: (personaId: string) =>
      `/api/ai/personas/${personaId}/avatar/generate`,
    apiAiSuggestPersonaField: (personaId: string) =>
      `/api/ai/personas/${personaId}/suggest-field`,
    apiAiEnrichPersona: (personaId: string) => `/api/ai/personas/${personaId}/enrich`,
    apiAiDerivePersonaAgentProfile: (personaId: string) =>
      `/api/ai/personas/${personaId}/derive-agent-profile`,
    apiAiGenerateMoodboard: (personaId: string) =>
      `/api/ai/personas/${personaId}/moodboard/generate`,
    apiAiSuggestTargetGroups: (projectId: string) =>
      `/api/ai/projects/${projectId}/suggest-target-groups`,
    apiAiSuggestPersonas: (projectId: string) =>
      `/api/ai/projects/${projectId}/suggest-personas`,
    apiAiResearchStart: (projectId: string) =>
      `/api/ai/projects/${projectId}/research/start`,
    apiAiResearchStatus: (projectId: string) =>
      `/api/ai/projects/${projectId}/research/status`,
    apiAiResearchLatest: (projectId: string) =>
      `/api/ai/projects/${projectId}/research/latest`,
    /** Apply latest research summary → project knowledge chapters */
    apiAiResearchApplyKnowledge: (projectId: string) =>
      `/api/ai/projects/${projectId}/research/apply-knowledge`,
    apiAiResearchStream: (projectId: string) =>
      `/api/ai/projects/${projectId}/research/stream`,
    /** Distill dossier + research → Collection Knowledge Pack research_brief. */
    apiAiKnowledgePackPublish: (projectId: string) =>
      `/api/ai/projects/${encodeURIComponent(projectId)}/knowledge-pack/publish`,
    apiTargetGroupKnowledge: (tgId: string) => `/api/target-groups/${tgId}/knowledge`,
    apiTargetGroupKnowledgeEntry: (tgId: string, entryId: string) =>
      `/api/target-groups/${tgId}/knowledge/${entryId}`,
    apiPersonaKnowledge: (personaId: string) => `/api/personas/${personaId}/knowledge`,
    apiPersonaKnowledgeEntry: (personaId: string, entryId: string) =>
      `/api/personas/${personaId}/knowledge/${entryId}`,
    apiAiGenerateJourneyFromProject: (projectId: string) =>
      `/api/ai/projects/${projectId}/generate-journey`,
    apiAiGenerateJourney: '/api/ai/journeys/generate',
    apiAiGenerateJourneyPhaseMoments: (journeyId: string) =>
      `/api/ai/journeys/${journeyId}/phase/generate`,
    apiAiValidateJourney: (journeyId: string) => `/api/ai/journeys/${journeyId}/validate`,
    apiAiJourneyValidationReports: (journeyId: string) =>
      `/api/ai/journeys/${journeyId}/validation-reports`,
    apiAiJourneyValidationReport: (journeyId: string, reportId: string) =>
      `/api/ai/journeys/${journeyId}/validation-reports/${reportId}`,
    apiAiOptions: '/api/ai/options',
  },
  envPersonaDataSource: 'NEXT_PERSONA_DATA_SOURCE',
  envPersonaBackendInternal: 'NEXT_PERSONA_BACKEND_INTERNAL_URL',
  envPersonaBackendPublic: 'NEXT_PUBLIC_PERSONA_BACKEND_URL',
  envChatApiInternal: 'NEXT_CHAT_API_INTERNAL_URL',
  envAiRuntime: 'NEXT_AI_RUNTIME',
  envOpenAiApiKey: 'OPENAI_API_KEY',
  envOpenAiApiBaseUrl: 'OPENAI_API_BASE_URL',
  envAiOpenAiModel: 'AI_OPENAI_MODEL',
  envUxJourneyOpenAiModel: 'UX_JOURNEY_OPENAI_MODEL',
  envAiOpenAiImageModel: 'AI_OPENAI_IMAGE_MODEL',
  /** Plexon federation — knowledge/plexon-federation.md */
  envPlexonAuthUrl: 'PLEXON_AUTH_URL',
  envPlexonServiceSecret: 'PLEXON_SERVICE_SECRET',
  envPlexonRegisterUrl: 'NEXT_PUBLIC_PLEXON_REGISTER_URL',
  /** Demo owner/company for machine sync when no session (Coolify). */
  envPlexonDemoOwner: 'PLEXON_DEMO_OWNER_USER_ID',
  envPlexonDemoCompany: 'PLEXON_DEMO_COMPANY_ID',
  /** CHECKION public base for single-scan deep-links (client; preferred). */
  envCheckionBaseUrlPublic: 'NEXT_PUBLIC_CHECKION_BASE_URL',
  /** Ecosystem alias (Plexon / CHECKION Coolify also use this name). */
  envCheckionPublicUrlAlias: 'NEXT_PUBLIC_CHECKION_URL',
  /** CHECKION base (server / Coolify). Falls back for link builders when public unset. */
  envCheckionBaseUrl: 'NEXT_CHECKION_BASE_URL',
  /** Machine Bearer for CHECKION fetch-page / optional scan APIs (`checkion_…`). */
  envCheckionApiToken: 'CHECKION_API_TOKEN',
  /** CHECKION thin Chromium text route (relative). */
  checkionApiFetchPage: '/api/fetch-page',
  checkionFetchPageTimeoutMs: 90_000,
  /** Documented staging default — only used when env unset in non-prod helpers. */
  checkionStagingBaseUrl: 'https://checkion-v3.projects-a.plygrnd.tech',
  envAuthSecret: 'AUTH_SECRET',
  /** Local-only NextAuth fallback when AUTH_SECRET unset (never use in prod). */
  authDevFallbackSecret: 'audion-v3-local-dev-auth-secret-min-32chars',
  plexonFederationContractVersion: '2026-05-plexon-federation-v3',
}

/** Resolve a persona portrait path from the central avatar base. */
export function personaAvatarPath(personaId: string): string {
  return `${paths.personaAvatarBasePath}/${personaId}.svg`
}

/** Resolve a persona visual / moodboard tile path from the central visuals base. */
export function personaVisualPath(slug: string): string {
  return `${paths.personaVisualBasePath}/${slug}.svg`
}
