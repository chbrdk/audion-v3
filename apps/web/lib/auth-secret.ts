import { paths } from './paths'

/**
 * NextAuth JWT secret. Uses AUTH_SECRET when set; otherwise a local-only fallback
 * so fixture mode / SessionProvider does not 500 with MissingSecret.
 */
export function getAuthSecret(): string {
  const fromEnv = process.env[paths.envAuthSecret]?.trim()
  if (fromEnv && fromEnv.length >= 32) return fromEnv
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[AUDION-v3] AUTH_SECRET is missing or too short (min 32 chars). Set AUTH_SECRET in production.',
    )
  }
  return paths.authDevFallbackSecret
}
