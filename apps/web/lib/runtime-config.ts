import { paths } from './paths'

export const runtimeConfig = {
  appName: 'AUDION v3',
  appPort: Number(process.env.PORT || paths.devPort),
  personaBackendInternalUrl:
    process.env.NEXT_PERSONA_BACKEND_INTERNAL_URL?.trim() || paths.personaBackendInternalUrl,
  personaBackendPublicUrl: process.env.NEXT_PUBLIC_PERSONA_BACKEND_URL?.trim() || null,
  chatApiInternalUrl:
    process.env.NEXT_CHAT_API_INTERNAL_URL?.trim() || paths.chatApiInternalUrl,
  /** fixtures | api | auto — auto falls back to demo data when API is unreachable */
  personaDataSource: (process.env.NEXT_PERSONA_DATA_SOURCE?.trim() || paths.personaDataSource) as
    | 'fixtures'
    | 'api'
    | 'auto',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '',
} as const

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
  return runtimeConfig.personaDataSource === 'fixtures'
}

export function allowPersonaFixtureFallback(): boolean {
  return runtimeConfig.personaDataSource === 'fixtures' || runtimeConfig.personaDataSource === 'auto'
}

/** Chat MVP defaults to fixtures until chat-api is wired in api-only mode. */
export function shouldUseChatFixtures(): boolean {
  return runtimeConfig.personaDataSource !== 'api'
}
