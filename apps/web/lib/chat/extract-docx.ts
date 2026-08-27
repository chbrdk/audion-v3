/**
 * DOCX → plain text extraction (mammoth) with char cap.
 * Spec: specs/domain/chat-document-attachments.md
 */

import mammoth from 'mammoth'

const TRUNCATION_MARKER = '\n\n[… truncated]'

export async function extractDocxText(
  buffer: Buffer,
  maxChars: number,
): Promise<{ text: string; truncated: boolean }> {
  const result = await mammoth.extractRawText({ buffer })
  const raw = (result.value || '').replace(/\r\n/g, '\n').trim()
  if (raw.length <= maxChars) {
    return { text: raw, truncated: false }
  }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length)
  return { text: `${raw.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true }
}
