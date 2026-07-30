import type { ProjectKnowledgeChapter } from '@audion-v3/contracts'

const LEGACY_BRIEF_ID = 'knowledge-brief'

/** Tags allowed in knowledge chapter WYSIWYG HTML. */
export const KNOWLEDGE_HTML_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'blockquote',
] as const

const ALLOWED = new Set<string>(KNOWLEDGE_HTML_ALLOWED_TAGS)

export function stripKnowledgeHtml(html: string): string {
  if (!html) return ''
  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim()
  }
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isEmptyKnowledgeBody(body: string): boolean {
  return !stripKnowledgeHtml(body)
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plain text → simple paragraph HTML; already-HTML bodies pass through. */
export function toKnowledgeHtml(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtmlText(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * Allowlist sanitizer — no jsdom/DOMPurify (avoids Next.js ENOENT on
 * `.next/browser/default-stylesheet.css` from isomorphic-dompurify).
 */
export function sanitizeKnowledgeHtml(html: string): string {
  if (!html.trim()) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, rawTag: string, rawAttrs = '') => {
      const tag = rawTag.toLowerCase()
      const closing = match.startsWith('</')
      if (!ALLOWED.has(tag)) return ''
      if (closing) return `</${tag}>`
      if (tag === 'br') return '<br>'
      // Drop all attributes (no href/on* vectors for knowledge prose)
      void rawAttrs
      return `<${tag}>`
    })
}

export function joinCompanyContext(chapters: ProjectKnowledgeChapter[]): string | null {
  const text = chapters
    .map((c) => stripKnowledgeHtml(c.body))
    .filter(Boolean)
    .join('\n\n')
  return text || null
}

export function normalizeKnowledgeChapter(raw: unknown): ProjectKnowledgeChapter | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : null
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  const body = typeof item.body === 'string' ? item.body : ''
  if (!id || !title) return null
  return { id, title, body }
}

export function normalizeKnowledgeChapters(raw: unknown): ProjectKnowledgeChapter[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeKnowledgeChapter)
    .filter((c): c is ProjectKnowledgeChapter => Boolean(c))
}

/** Prefer chapters; if empty, wrap legacy companyContext as a single Brief chapter. */
export function resolveKnowledgeChapters(
  chapters: ProjectKnowledgeChapter[] | undefined | null,
  companyContext: string | null | undefined,
): ProjectKnowledgeChapter[] {
  if (chapters && chapters.length > 0) return chapters
  const brief = companyContext?.trim()
  if (!brief) return []
  return [{ id: LEGACY_BRIEF_ID, title: 'Brief', body: toKnowledgeHtml(brief) }]
}

export function newKnowledgeChapterId(): string {
  return `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function knowledgePreviewLine(body: string, max = 110): string {
  const line = stripKnowledgeHtml(body)
  if (!line) return 'Empty chapter'
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
