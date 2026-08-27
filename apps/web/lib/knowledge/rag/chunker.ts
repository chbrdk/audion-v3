/**
 * Plain-text chunker for knowledge RAG.
 * Spec: specs/domain/chat-knowledge-rag.md
 */

export function stripHtmlToPlain(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function splitPreferringBoundaries(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const parts: string[] = []
  let rest = text
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars)
    let cut =
      window.lastIndexOf('\n\n') >= maxChars * 0.4
        ? window.lastIndexOf('\n\n')
        : window.lastIndexOf('\n') >= maxChars * 0.4
          ? window.lastIndexOf('\n')
          : window.lastIndexOf(' ') >= maxChars * 0.4
            ? window.lastIndexOf(' ')
            : maxChars
    if (cut <= 0) cut = maxChars
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trimStart()
  }
  if (rest) parts.push(rest)
  return parts.filter(Boolean)
}

/** Chunk plain text with overlap; caps at maxChunks. */
export function chunkPlainText(
  text: string,
  opts: { chunkChars: number; overlapChars: number; maxChunks: number },
): string[] {
  const plain = text.trim()
  if (!plain) return []
  const { chunkChars, overlapChars, maxChunks } = opts
  const overlap = Math.max(0, Math.min(overlapChars, chunkChars - 1))
  const raw = splitPreferringBoundaries(plain, chunkChars)
  if (raw.length <= 1) return raw.slice(0, maxChunks)

  const out: string[] = []
  for (let i = 0; i < raw.length && out.length < maxChunks; i++) {
    let piece = raw[i]!
    if (i > 0 && overlap > 0) {
      const prev = raw[i - 1]!
      const tail = prev.slice(Math.max(0, prev.length - overlap))
      piece = `${tail}${piece.startsWith('\n') ? '' : '\n'}${piece}`.trim()
    }
    out.push(piece)
  }
  return out
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}
