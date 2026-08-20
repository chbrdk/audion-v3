/**
 * Allowlisted embed theme ids — aligned with Plexon `lib/assistant/embed-theme.ts`.
 * Spec: audion-v3/specs/domain/chat-embed.md · plexon-v3/specs/api/assistant-embed.md
 */

export const CHAT_EMBED_THEME_ALLOWLIST = [
  'msqdx',
  'msqdx-dark',
  'msqdx-v2',
  'msqdx-v2-dark',
  'msqdx-ui',
  'msqdx-ui-dark',
  'forest',
  'light',
  'dark',
] as const

export type ChatEmbedThemeId = (typeof CHAT_EMBED_THEME_ALLOWLIST)[number]

export function normalizeChatEmbedTheme(raw: string | null | undefined): ChatEmbedThemeId | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  return (CHAT_EMBED_THEME_ALLOWLIST as readonly string[]).includes(value)
    ? (value as ChatEmbedThemeId)
    : null
}

/** Apply host theme on `<html>` so `@msqdx/ui` tokens resolve in iframe embeds. */
export function applyChatEmbedTheme(themeId: string | null | undefined): boolean {
  const normalized = normalizeChatEmbedTheme(themeId)
  if (!normalized || typeof document === 'undefined') return false
  document.documentElement.setAttribute('data-theme', normalized)
  return true
}
