import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts'
import { paths } from '../paths'

export async function postChatStream(
  payload: ChatSendPayload,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(paths.routes.apiChatStream, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify(payload),
    signal,
  })
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null
    onEvent({ type: 'error', message: err?.error || `Stream failed (${response.status})` })
    return
  }
  if (!response.body) {
    onEvent({ type: 'error', message: 'Empty stream body' })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        onEvent(JSON.parse(trimmed) as ChatStreamEvent)
      } catch {
        onEvent({ type: 'error', message: 'Malformed stream chunk' })
      }
    }
  }
  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer.trim()) as ChatStreamEvent)
    } catch {
      /* ignore trailing junk */
    }
  }
}
