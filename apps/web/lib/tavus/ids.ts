/** Tavus Face / PAL id helpers. Spec: specs/domain/tavus-video-chat.md */

export function trimTavusId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function firstTavusId(...candidates: unknown[]): string | null {
  for (const value of candidates) {
    const id = trimTavusId(value)
    if (id) return id
  }
  return null
}

export function personaTavusIds(persona: {
  tavusReplicaId?: string | null
  tavusPersonaId?: string | null
}): { replicaId: string | null; palId: string | null } {
  return {
    replicaId: trimTavusId(persona.tavusReplicaId),
    palId: trimTavusId(persona.tavusPersonaId),
  }
}

export function tavusEmbedUrl(conversationUrl: string, meetingToken?: string | null): string {
  const token = trimTavusId(meetingToken)
  if (!token) return conversationUrl
  const sep = conversationUrl.includes('?') ? '&' : '?'
  return `${conversationUrl}${sep}t=${encodeURIComponent(token)}`
}
