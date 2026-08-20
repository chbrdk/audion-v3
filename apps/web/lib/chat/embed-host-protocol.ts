/**
 * Host → Audion chat embed postMessage (theme sync only).
 * Reuses Plexon assistant host source for EQC overlay parity.
 */

export const CHAT_EMBED_HOST_SOURCE = 'plexon-assistant-host' as const

export type ChatEmbedHostThemeMessage = {
  source: typeof CHAT_EMBED_HOST_SOURCE
  type: 'assistant:theme'
  themeId?: string
}

export function isChatEmbedHostThemeMessage(data: unknown): data is ChatEmbedHostThemeMessage {
  if (!data || typeof data !== 'object') return false
  const row = data as Record<string, unknown>
  return row.source === CHAT_EMBED_HOST_SOURCE && row.type === 'assistant:theme'
}

/** Trusted Plexon origins for embed theme postMessage. */
export function chatEmbedHostOrigins(): string[] {
  const out = new Set<string>()
  for (const raw of [
    process.env.NEXT_PUBLIC_PLEXON_URL?.trim(),
    process.env.PLEXON_AUTH_URL?.trim(),
  ]) {
    if (!raw) continue
    try {
      out.add(new URL(raw).origin)
    } catch {
      /* ignore invalid env */
    }
  }
  return [...out]
}

export function isTrustedChatEmbedHostOrigin(origin: string): boolean {
  if (!origin) return false
  const allowed = chatEmbedHostOrigins()
  if (allowed.length === 0) return true
  return allowed.includes(origin)
}
