/**
 * PPTX → plain text (slide XML text runs via JSZip).
 * Spec: specs/domain/chat-document-attachments.md
 */
import JSZip from 'jszip'
import { paths } from '../paths'

const TRUNCATION_MARKER = '\n\n[… truncated]'

function applyCharCap(text: string, maxChars: number): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length)
  return { text: `${trimmed.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true }
}

export async function extractPptxText(
  buffer: Buffer,
  maxChars: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!buffer.byteLength) {
    return { text: '', truncated: false }
  }
  const zip = await JSZip.loadAsync(buffer)
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(/slide(\d+)/i.exec(a)?.[1] || 0)
      const nb = Number(/slide(\d+)/i.exec(b)?.[1] || 0)
      return na - nb
    })
    .slice(0, paths.chatDocumentPptxMaxSlides)
  const parts: string[] = []
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async('string')
    if (!xml) continue
    const safeXml = xml.length > 2_000_000 ? xml.slice(0, 2_000_000) : xml
    const texts = [...safeXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) =>
      m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
    )
    const slide = texts.filter(Boolean).join(' ')
    if (slide) parts.push(slide)
  }
  return applyCharCap(parts.join('\n\n'), maxChars)
}
