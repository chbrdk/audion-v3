/**
 * Soft post-filter for persona chat replies.
 * Spec: specs/domain/chat-workspace.md · knowledge/persona-chat-humanize-2026-09-20.md
 */

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu

const CATEGORY_LABEL_RE =
  /\*{0,2}\s*(?:Unbranded|Branded)\s*(?:\/\s*)?(?:kategorial|vergleichend|Reputationscheck)?\s*\*{0,2}\s*:?\s*/gi

const TRAILING_INTERVIEW_RE =
  /(?:\n|^)\s*(?:Und bei dir\??|How about you\??|What about you\??|Was ist mit dir\??|Bei dir\s*[—–-]?\s*bist du[^.?!]*[.?!]?)\s*$/gim

const COACH_OFFER_RE =
  /(?:^|\n)[^\n]*(?:Wenn du willst|If you want I can|Sag mir kurz)[^\n]*/gi

const HEADING_LINE_RE = /^#{1,6}\s+.*$/gm

/** Strip assistant-y residue without rewriting the persona's point. */
export function humanizePersonaReply(raw: string): string {
  let text = (raw || '').trim()
  if (!text) return text

  text = text.replace(EMOJI_RE, '')
  text = text.replace(HEADING_LINE_RE, '')
  text = text.replace(CATEGORY_LABEL_RE, '')
  text = text.replace(COACH_OFFER_RE, '')
  text = text.replace(TRAILING_INTERVIEW_RE, '')
  text = text.replace(/[ \t]+\n/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[ \t]{2,}/g, ' ')
  return text.trim()
}
