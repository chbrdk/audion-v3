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
  /** Full persona chat (Tavus video, inspect, moodboard) — EQC logged-in overlay. */
  full?: boolean
}

/** Chrome-stripped iframe chat — EQC overlay / public guest. Spec: chat-embed.md */
export function buildChatEmbedHref(params: ChatEmbedParams): string {
  const qs = new URLSearchParams({
    personaId: params.personaId.trim(),
    projectId: params.projectId.trim(),
  })
  qs.set('embed', params.full ? 'full' : '1')
  const theme = params.theme?.trim()
  if (theme) qs.set('theme', theme)
  return `/chat/embed?${qs.toString()}`
}

/** Persona chat deep-link: /chat?personaId= (drops conversationId). */
export function buildChatPersonaHref(personaId: string): string {
  const id = personaId.trim()
  if (!id) return '/chat'
  const qs = new URLSearchParams({ personaId: id })
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

const BROWSE_FIND_CUES_RE =
  /\b(suche|such(?:e)?|finde|find(?:e)?|look for|g(?:rill|arten)|produkt|kategorie)\b/i

function isWeakInspectGoal(goal: string, url: string): boolean {
  const g = goal.trim().toLowerCase()
  if (!g) return true
  const host = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
  if (host && g.includes(host.replace(/^www\./i, '')) && !BROWSE_FIND_CUES_RE.test(g)) {
    return true
  }
  if (/^(?:ok,?\s*)?(?:schau(?:e)?(?: mal)?(?: auf| an)?|guck(?:e)?(?: mal)?(?: auf| an)?)\b/i.test(g)) {
    return !BROWSE_FIND_CUES_RE.test(g)
  }
  return false
}

/** Scan recent user turns (newest first) for a browse/find goal tied to the URL. */
export function extractInspectGoalFromMessages(messages: string[], url: string): string | null {
  const pool = [...messages].reverse()
  for (const msg of pool) {
    if (!BROWSE_FIND_CUES_RE.test(msg)) continue
    const goal = extractInspectGoalFromMessage(msg, url)
    if (goal && !isWeakInspectGoal(goal, url)) return goal
  }
  for (const msg of pool) {
    const goal = extractInspectGoalFromMessage(msg, url)
    if (goal && !isWeakInspectGoal(goal, url)) return goal
  }
  return null
}

export function buildInspectAgentTaskFromGoal(url: string, goal: string): string {
  return `Starte auf ${url}. Aufgabe: ${goal}. Verfolge diese Aufgabe in jedem Schritt.`
}

/** Task string for the UX journey agent — preserves browse/find goals from chat. */
export function buildInspectAgentTask(
  message: string,
  url: string,
  contextMessages?: string[] | null,
): string {
  const pool = [...(contextMessages ?? []), message].filter(Boolean)
  const goal = extractInspectGoalFromMessages(pool, url)
  if (goal) {
    return buildInspectAgentTaskFromGoal(url, goal)
  }
  return `Inspect ${url} as this persona and note journey friction.`
}
