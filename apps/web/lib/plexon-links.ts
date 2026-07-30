import { getPlexonRegisterUrl } from './runtime-config'

function getConfiguredPlexonOrigin(): string | null {
  const raw = getPlexonRegisterUrl()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/** Public register page on Plexon (build-time public URL). */
export function getPlexonRegisterPageUrl(): string | null {
  return getPlexonRegisterUrl()
}

/** Plexon `/forgot-password` — same origin as register URL. */
export function getPlexonForgotPasswordUrl(): string | null {
  const origin = getConfiguredPlexonOrigin()
  if (!origin) return null
  return `${origin}/forgot-password`
}
