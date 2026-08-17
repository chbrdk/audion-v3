/**
 * Resolve CSP frame-ancestors for `/chat/embed`.
 * Spec: specs/domain/chat-embed.md — never hardcode host FQDNs in UI.
 */

import { paths } from '../paths'

function originFromUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

/** Space-separated origins for Content-Security-Policy frame-ancestors. */
export function resolveChatEmbedFrameAncestors(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = env[paths.envChatEmbedFrameAncestors]?.trim()
  if (explicit) return explicit

  const fromPublic = originFromUrl(env[paths.envPlexonPublicUrl])
  const fromAuth = originFromUrl(env[paths.envPlexonAuthUrl])
  const origins = [...new Set([fromPublic, fromAuth].filter(Boolean))] as string[]
  if (origins.length) return origins.join(' ')

  // Local / unset: allow same-origin embedding only ('self').
  return "'self'"
}

export function chatEmbedContentSecurityPolicy(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `frame-ancestors ${resolveChatEmbedFrameAncestors(env)}`
}
