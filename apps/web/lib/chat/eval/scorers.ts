/**
 * Deterministic persona-chat eval scorers (locale-aware).
 * Spec: specs/domain/persona-chat-eval.md
 */

import type {
  ChatEvalCase,
  ChatEvalCaseResult,
  ChatEvalCheckResult,
  ChatEvalForbid,
  ChatEvalLocale,
} from './types'

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u

const INTERVIEW_RE: Record<ChatEvalLocale, RegExp> = {
  de: /und bei dir\??|was ist mit dir\??|bei dir\s*[—–-]/i,
  en: /how about you\??|what about you\??|and you\??\s*$/i,
}

const COACH_RE: Record<ChatEvalLocale, RegExp> = {
  de: /wenn du willst|sag mir kurz|formuliere ich/i,
  en: /if you want i can|if you'd like i can|just tell me briefly/i,
}

const CATEGORY_RE =
  /(?:\bU\s*=|\bBV\s*=|\bBR\s*=|unbranded|reputationscheck|branded\s*\/\s*compare|#{1,3}\s)/i

const DE_SIGNAL =
  /[äöüÄÖÜß]|\b(ich|und|nicht|das|die|der|ist|mit|für|auch|noch|wenn|aber|oder|eine|einen)\b/gi
const EN_SIGNAL =
  /\b(the|and|you|what|how|are|that|with|for|this|have|would|about|from|not|but)\b/gi

export function countWords(text: string): number {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function countNumberedItems(text: string): number {
  // Accept "1. " and "1) " (models vary list markers by locale).
  return (String(text || '').match(/^\s*\d+[.)]\s+/gm) || []).length
}

/** Lightweight locale heuristic for reply language. */
export function detectReplyLocale(text: string): ChatEvalLocale {
  const t = String(text || '')
  const de = (t.match(DE_SIGNAL) || []).length
  const en = (t.match(EN_SIGNAL) || []).length
  return en > de ? 'en' : 'de'
}

function checkMaxWords(reply: string, max: number): ChatEvalCheckResult {
  const n = countWords(reply)
  return {
    id: 'maxWords',
    passed: n <= max,
    detail: `${n} words (max ${max})`,
  }
}

function checkEmoji(reply: string): ChatEvalCheckResult {
  const hit = EMOJI_RE.test(reply)
  return { id: 'noEmoji', passed: !hit, detail: hit ? 'emoji found' : 'ok' }
}

function checkInterview(reply: string, locale: ChatEvalLocale): ChatEvalCheckResult {
  const hit = INTERVIEW_RE[locale].test(reply) || INTERVIEW_RE.de.test(reply) || INTERVIEW_RE.en.test(reply)
  return {
    id: 'noInterviewCloser',
    passed: !hit,
    detail: hit ? 'interview closer found' : 'ok',
  }
}

function checkCategory(reply: string): ChatEvalCheckResult {
  const hit = CATEGORY_RE.test(reply)
  return {
    id: 'noCategoryLabels',
    passed: !hit,
    detail: hit ? 'category/method label found' : 'ok',
  }
}

function checkCoach(reply: string, locale: ChatEvalLocale): ChatEvalCheckResult {
  const hit = COACH_RE[locale].test(reply) || COACH_RE.de.test(reply) || COACH_RE.en.test(reply)
  return {
    id: 'noCoachOffer',
    passed: !hit,
    detail: hit ? 'coach offer found' : 'ok',
  }
}

function checkNumbered(reply: string, max: number): ChatEvalCheckResult {
  const n = countNumberedItems(reply)
  return {
    id: 'maxNumbered',
    passed: n <= max,
    detail: `${n} numbered items (max ${max})`,
  }
}

function checkLocale(reply: string, expected: ChatEvalLocale): ChatEvalCheckResult {
  const got = detectReplyLocale(reply)
  return {
    id: 'localeMatch',
    passed: got === expected,
    detail: `detected ${got} (expected ${expected})`,
  }
}

function runForbid(
  reply: string,
  locale: ChatEvalLocale,
  tag: ChatEvalForbid,
): ChatEvalCheckResult | null {
  switch (tag) {
    case 'emoji':
      return checkEmoji(reply)
    case 'interview':
      return checkInterview(reply, locale)
    case 'category':
      return checkCategory(reply)
    case 'coach':
      return checkCoach(reply, locale)
    default:
      return null
  }
}

/** Score one reply against a catalog case. */
export function scorePersonaChatCase(
  evalCase: ChatEvalCase,
  reply: string,
): ChatEvalCaseResult {
  const text = String(reply || '').trim()
  const checks: ChatEvalCheckResult[] = []
  const { expectations, locale } = evalCase

  checks.push(checkMaxWords(text, expectations.maxWords))

  for (const tag of expectations.forbid ?? []) {
    const result = runForbid(text, locale, tag)
    if (result) checks.push(result)
  }

  if (typeof expectations.maxNumbered === 'number') {
    checks.push(checkNumbered(text, expectations.maxNumbered))
  }

  if (expectations.requireLocaleMatch !== false) {
    checks.push(checkLocale(text, locale))
  }

  return {
    caseId: evalCase.id,
    locale: evalCase.locale,
    mode: evalCase.mode,
    passed: checks.every((c) => c.passed),
    wordCount: countWords(text),
    checks,
    replyPreview: text.slice(0, 280),
  }
}

export function summarizeEvalResults(results: ChatEvalCaseResult[]): {
  total: number
  passed: number
  failed: number
  passRate: number
} {
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  return {
    total,
    passed,
    failed: total - passed,
    passRate: total ? passed / total : 0,
  }
}
