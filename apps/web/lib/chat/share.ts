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

export type ChatEmbedParams = ChatShareParams & {
  theme?: string | null
  /** Marker for hosts; default true when building embed href. */
  embed?: boolean
}

/** Chrome-stripped iframe chat — EQC overlay / public guest. Spec: chat-embed.md */
export function buildChatEmbedHref(params: ChatEmbedParams): string {
  const qs = new URLSearchParams({
    personaId: params.personaId.trim(),
    projectId: params.projectId.trim(),
  })
  if (params.embed !== false) qs.set('embed', '1')
  const theme = params.theme?.trim()
  if (theme) qs.set('theme', theme)
  return `/chat/embed?${qs.toString()}`
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

/** User goal from chat text after stripping the inspect URL (e.g. "suche nach Grillplatte"). */
export function extractInspectGoalFromMessage(message: string, url: string): string | null {
  let t = message.trim()
  if (!t) return null
  const variants = [
    url,
    url.replace(/^https:\/\//i, ''),
    url.replace(/^https:\/\/www\./i, 'www.'),
  ]
  for (const v of variants) {
    if (!v) continue
    t = t.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }
  t = t
    .replace(/https?:\/\/[^\s<>"')]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  t = t
    .replace(
      /^(?:schau(?:e)?(?: dir| mal)?(?: auf| an)?|guck(?:e)?(?: mal)?(?: auf| an)?|geh(?:e)?(?: mal)?(?: auf| zu)?|bitte|auf)\s+/i,
      '',
    )
    .replace(/\bsuche\s+auf\s+nach\b/i, 'suche nach')
    .replace(/\bsuch\s+auf\s+nach\b/i, 'such nach')
    .replace(/\s+auf\s+nach\b/i, ' nach')
    .trim()
  if (t.length < 8) return null
  return t
}

/** Task string for the UX journey agent — preserves browse/find goals from chat. */
export function buildInspectAgentTask(message: string, url: string): string {
  const goal = extractInspectGoalFromMessage(message, url)
  if (goal) {
    return `Starte auf ${url}. Aufgabe: ${goal}. Verfolge diese Aufgabe in jedem Schritt.`
  }
  return `Inspect ${url} as this persona and note journey friction.`
}
