/** Chat share + modality URL helpers — keep routes central in paths.ts. */

export type ChatShareParams = {
  personaId: string
  projectId: string
}

/** Public share deep-link (V2: /chat?personaId=&projectId=). */
export function buildChatShareHref(params: ChatShareParams): string {
  const qs = new URLSearchParams({
    personaId: params.personaId.trim(),
    projectId: params.projectId.trim(),
  })
  return `/chat?${qs.toString()}`
}

export type ChatConversationHrefParams = {
  conversationId: string
  personaId?: string | null
}

/** Resume a conversation from history. */
export function buildChatConversationHref(params: ChatConversationHrefParams): string {
  const qs = new URLSearchParams({
    conversationId: params.conversationId.trim(),
  })
  if (params.personaId?.trim()) qs.set('personaId', params.personaId.trim())
  return `/chat?${qs.toString()}`
}

const URL_WITH_SCHEME_RE = /https?:\/\/[^\s<>"')]+/i
/** Bare host like msqdx.com or www.msqdx.com/path (no scheme). */
const BARE_HOST_RE =
  /(?:^|[\s("'[(])(((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})(?::\d{2,5})?(?:\/[^\s<>"']*)?)/i

export function extractUrlFromMessage(message: string): string | null {
  const withScheme = message.match(URL_WITH_SCHEME_RE)?.[0]
  if (withScheme) {
    return withScheme.replace(/[.,;:!?)]+$/, '')
  }
  const bare = message.match(BARE_HOST_RE)?.[1]
  if (!bare) return null
  const cleaned = bare.replace(/[.,;:!?)]+$/, '')
  if (!cleaned.includes('.')) return null
  return `https://${cleaned}`
}
