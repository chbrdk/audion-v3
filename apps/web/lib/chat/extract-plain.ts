/**
 * Markdown / plain TXT → text with char cap.
 * Spec: specs/domain/chat-document-attachments.md
 */

const TRUNCATION_MARKER = '\n\n[… truncated]'

function applyCharCap(text: string, maxChars: number): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length)
  return { text: `${trimmed.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true }
}

export function extractMarkdownText(
  buffer: Buffer,
  maxChars: number,
): { text: string; truncated: boolean } {
  let raw = buffer.toString('utf8').replace(/\r\n/g, '\n')
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3)
    if (end >= 0) raw = raw.slice(end + 4)
  }
  const stripped = raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
  return applyCharCap(stripped, maxChars)
}

export function extractPlainText(
  buffer: Buffer,
  maxChars: number,
): { text: string; truncated: boolean } {
  return applyCharCap(buffer.toString('utf8'), maxChars)
}
