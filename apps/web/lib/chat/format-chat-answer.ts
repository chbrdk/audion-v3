/** Lightweight chat answer formatting — markdown-ish blocks + inline + [n] cites. */

export type ChatInline =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'cite'; n: number }

export type ChatBlock =
  | { type: 'h'; level: 2 | 3; inlines: ChatInline[] }
  | { type: 'p'; inlines: ChatInline[] }
  | { type: 'ol'; items: ChatInline[][] }
  | { type: 'ul'; items: ChatInline[][] }

const HEADING_RE = /^(#{1,3})\s+(.+)$/
const OL_RE = /^(\d+)[.)]\s+(.+)$/
const UL_RE = /^[-*•]\s+(.+)$/
const CITE_RE = /\[(\d+)\]/g

export function normalizeChatMarkdown(raw: string): string {
  let text = (raw ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) return ''
  text = text.replace(/(^|\n)\*\*([^*\n]{2,120}?):\*\*\s*/g, '$1## $2\n\n')
  text = text.replace(/(^|\n)\*\*([^*\n]{2,120}?)\*\*:\s*/g, '$1## $2\n\n')
  text = text.replace(/([:；.!?])\s+(\d{1,2})[.)]\s+/g, '$1\n$2. ')
  text = text.replace(/(\S)\s+(\d{1,2})[.)]\s+(?=\*\*|[A-ZÄÖÜ])/g, '$1\n$2. ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

export function parseChatBlocks(raw: string): ChatBlock[] {
  const text = normalizeChatMarkdown(raw)
  if (!text) return []

  const lines = text.split('\n')
  const blocks: ChatBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()
    if (!trimmed) {
      i += 1
      continue
    }

    const heading = trimmed.match(HEADING_RE)
    if (heading) {
      const level = Math.min(3, heading[1]!.length) as 1 | 2 | 3
      blocks.push({
        type: 'h',
        level: level === 1 ? 2 : (level as 2 | 3),
        inlines: parseChatInlines(heading[2]!),
      })
      i += 1
      continue
    }

    if (OL_RE.test(trimmed)) {
      const items: ChatInline[][] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row) break
        const m = row.match(OL_RE)
        if (!m) break
        items.push(parseChatInlines(m[2]!))
        i += 1
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    if (UL_RE.test(trimmed)) {
      const items: ChatInline[][] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row) break
        const m = row.match(UL_RE)
        if (!m) break
        items.push(parseChatInlines(m[1]!))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    const para: string[] = []
    while (i < lines.length) {
      const row = lines[i] ?? ''
      const t = row.trim()
      if (!t) break
      if (HEADING_RE.test(t) || OL_RE.test(t) || UL_RE.test(t)) break
      para.push(t)
      i += 1
    }
    blocks.push({ type: 'p', inlines: parseChatInlines(para.join(' ')) })
  }

  return blocks
}

export function parseChatInlines(raw: string): ChatInline[] {
  const text = raw ?? ''
  if (!text) return []

  const withMarks: Array<{ type: 'text' | 'strong' | 'em'; value: string }> = []
  const markRe = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0
  for (const m of text.matchAll(markRe)) {
    const idx = m.index ?? 0
    if (idx > last) withMarks.push({ type: 'text', value: text.slice(last, idx) })
    if (m[1] != null) withMarks.push({ type: 'strong', value: m[1] })
    else if (m[2] != null) withMarks.push({ type: 'em', value: m[2] })
    last = idx + m[0].length
  }
  if (last < text.length) withMarks.push({ type: 'text', value: text.slice(last) })

  const out: ChatInline[] = []
  for (const part of withMarks) {
    if (part.type !== 'text') {
      out.push(part)
      continue
    }
    let cursor = 0
    for (const cite of part.value.matchAll(CITE_RE)) {
      const idx = cite.index ?? 0
      if (idx > cursor) out.push({ type: 'text', value: part.value.slice(cursor, idx) })
      out.push({ type: 'cite', n: Number(cite[1]) })
      cursor = idx + cite[0].length
    }
    if (cursor < part.value.length) out.push({ type: 'text', value: part.value.slice(cursor) })
  }
  return out
}
