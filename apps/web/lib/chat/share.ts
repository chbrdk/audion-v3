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

const URL_RE = /https?:\/\/[^\s<>"')]+/i

export function extractUrlFromMessage(message: string): string | null {
  const match = message.match(URL_RE)
  return match?.[0]?.replace(/[.,;:!?)]+$/, '') ?? null
}
