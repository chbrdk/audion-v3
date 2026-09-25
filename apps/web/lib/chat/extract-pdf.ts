/**
 * PDF → plain text extraction (pdf-parse embedded text).
 * Scanned-PDF OCR deferred — see specs/domain/chat-document-attachments.md.
 */

import { PDFParse } from 'pdf-parse'

const TRUNCATION_MARKER = '\n\n[… truncated]'

function applyCharCap(text: string, maxChars: number): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length)
  return { text: `${trimmed.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true }
}

export async function extractPdfText(
  buffer: Buffer,
  maxChars: number,
): Promise<{ text: string; truncated: boolean }> {
  // pdfjs may transfer TypedArray ownership — copy so Buffer stays valid.
  const data = Uint8Array.from(buffer)
  const parser = new PDFParse({ data })
  let embedded = ''
  try {
    const result = await parser.getText()
    embedded = (result?.text || '').replace(/\r\n/g, '\n').trim()
  } finally {
    await parser.destroy().catch(() => undefined)
  }
  return applyCharCap(embedded, maxChars)
}
