import { paths } from './paths'
import { hasOpenAiApiKey } from './ai/client'

export const runtimeConfig = {
  appName: 'AUDION v3',
  appPort: Number(process.env.PORT || paths.devPort),
  personaBackendInternalUrl:
    process.env.NEXT_PERSONA_BACKEND_INTERNAL_URL?.trim() || paths.personaBackendInternalUrl,
  personaBackendPublicUrl: process.env.NEXT_PUBLIC_PERSONA_BACKEND_URL?.trim() || null,
  chatApiInternalUrl:
    process.env.NEXT_CHAT_API_INTERNAL_URL?.trim() || paths.chatApiInternalUrl,
  /** @deprecated prefer getPersonaDataSource() — env can change in tests */
  get personaDataSource() {
    return getPersonaDataSource()
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '',
} as const

export function getPersonaDataSource(): 'fixtures' | 'api' | 'auto' {
  return (process.env.NEXT_PERSONA_DATA_SOURCE?.trim() || paths.personaDataSource) as
    | 'fixtures'
    | 'api'
    | 'auto'
}

export function getPersonaBackendBase(options?: { preferPublic?: boolean }): string {
  if (typeof window !== 'undefined') {
    return `${runtimeConfig.basePath}/api`
  }
  if (options?.preferPublic && runtimeConfig.personaBackendPublicUrl) {
    return runtimeConfig.personaBackendPublicUrl
  }
  return runtimeConfig.personaBackendInternalUrl
}

export function getChatApiBase(): string {
  return runtimeConfig.chatApiInternalUrl
}

export function shouldUsePersonaFixturesOnly(): boolean {
  return getPersonaDataSource() === 'fixtures'
}

export function allowPersonaFixtureFallback(): boolean {
  const source = getPersonaDataSource()
  return source === 'fixtures' || source === 'auto'
}

export type AiRuntimeMode = 'stub' | 'native' | 'auto'

/** Native AI mode — orthogonal to domain DATA_SOURCE. */
export function getAiRuntime(): AiRuntimeMode {
  const raw = (process.env[paths.envAiRuntime]?.trim() || paths.aiRuntime) as AiRuntimeMode
  if (raw === 'stub' || raw === 'native' || raw === 'auto') return raw
  return 'auto'
}

/** Prefer native OpenAI when runtime is native, or auto with API key. */
export function shouldPreferAiNative(): boolean {
  const mode = getAiRuntime()
  if (mode === 'stub') return false
  if (mode === 'native') return true
  return hasOpenAiApiKey()
}

/** Fail hard when native unavailable (`native` only). */
export function shouldRequireAiNative(): boolean {
  return getAiRuntime() === 'native'
}

/**
 * Chat stub stream when AI runtime does not prefer native.
 * Domain DATA_SOURCE no longer forces chat stubs (orthogonal).
 */
export function shouldUseChatFixtures(): boolean {
  return !shouldPreferAiNative()
}

/** Prefer native chat stream. */
export function shouldPreferChatLive(): boolean {
  return shouldPreferAiNative()
}

/** Fail hard when native chat unavailable (`NEXT_AI_RUNTIME=native`). */
export function shouldRequireChatLive(): boolean {
  return shouldRequireAiNative()
}

/** Plexon auth URL (runtime — do not cache at import). */
export function getPlexonAuthUrl(): string {
  return process.env[paths.envPlexonAuthUrl]?.trim() || ''
}

export function getPlexonServiceSecret(): string {
  return process.env[paths.envPlexonServiceSecret]?.trim() || ''
}

export function getPlexonRegisterUrl(): string | null {
  return process.env[paths.envPlexonRegisterUrl]?.trim() || null
}

export function isPlexonAuthConfigured(): boolean {
  return Boolean(getPlexonAuthUrl() && getPlexonServiceSecret())
}

/**
 * CHECKION public base for deep-links.
 * Prefer static NEXT_PUBLIC_* reads so Next can inline them into the client bundle.
 */
export function getCheckionBaseUrl(): string {
  const publicBase =
    process.env.NEXT_PUBLIC_CHECKION_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_CHECKION_URL?.trim() ||
    ''
  if (publicBase) return publicBase
  if (typeof window !== 'undefined') return ''
  return process.env.NEXT_CHECKION_BASE_URL?.trim() || ''
}

export function isCheckionConfigured(): boolean {
  return Boolean(getCheckionBaseUrl())
}
