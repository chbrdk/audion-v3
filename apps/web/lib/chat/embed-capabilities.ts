/** Parse `embed` query — guest overlay vs full persona chat (Tavus, inspect, moodboard). */
export type ChatEmbedCapabilities = 'guest' | 'full'

export function parseChatEmbedCapabilities(embed: string | undefined): ChatEmbedCapabilities {
  const value = embed?.trim().toLowerCase()
  if (value === 'full') return 'full'
  return 'guest'
}

export function isFullChatEmbedCapabilities(capabilities: ChatEmbedCapabilities): boolean {
  return capabilities === 'full'
}
