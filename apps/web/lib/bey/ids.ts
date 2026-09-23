/** Beyond Presence id helpers. Spec: specs/domain/bey-video-chat.md */

import { paths } from '../paths'

export function trimBeyId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function firstBeyId(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = trimBeyId(candidate)
    if (value) return value
  }
  return null
}

export function beyChatEmbedUrl(agentId: string): string {
  const id = trimBeyId(agentId)
  return `${paths.beyChatEmbedBase.replace(/\/$/, '')}/${encodeURIComponent(id)}`
}
