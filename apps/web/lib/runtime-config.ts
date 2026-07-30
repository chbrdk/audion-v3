import { paths } from './paths'

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

/**
 * Chat fixtures-only when DATA_SOURCE=fixtures.
 * `auto` / `api` prefer live chat-api (see shouldPreferChatLive).
 */
export function shouldUseChatFixtures(): boolean {
  return getPersonaDataSource() === 'fixtures'
}

/** Try live chat-api (`auto` | `api`). */
export function shouldPreferChatLive(): boolean {
  return getPersonaDataSource() !== 'fixtures'
}

/** Fail hard when chat-api unreachable (`api` only). */
export function shouldRequireChatLive(): boolean {
  return getPersonaDataSource() === 'api'
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
