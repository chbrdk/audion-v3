/** Video call provider helpers. Spec: video-call-providers.md */

import type { ChatVideoCallProvider } from '@audion-v3/contracts'

export function parseVideoCallProvider(value: unknown): ChatVideoCallProvider | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase()
  if (raw === 'tavus' || raw === 'bey') return raw
  return null
}
