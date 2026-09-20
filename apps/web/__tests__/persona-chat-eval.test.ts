/**
 * Persona chat eval scorers + bilingual catalog.
 * Spec: specs/domain/persona-chat-eval.md
 */
import { describe, expect, it } from 'vitest'
import {
  PERSONA_CHAT_EVAL_CATALOG,
  countNumberedItems,
  countWords,
  detectReplyLocale,
  getPersonaChatEvalCase,
  listPersonaChatEvalCases,
  scorePersonaChatCase,
  summarizeEvalResults,
} from '../lib/chat/eval'

describe('persona chat eval catalog', () => {
  it('exports ≥18 unique bilingual cases spanning corpus modes', () => {
    const cases = listPersonaChatEvalCases()
    expect(cases.length).toBeGreaterThanOrEqual(18)
    expect(PERSONA_CHAT_EVAL_CATALOG).toHaveLength(cases.length)
    const ids = new Set(cases.map((c) => c.id))
    expect(ids.size).toBe(cases.length)
    expect(cases.filter((c) => c.locale === 'de').length).toBeGreaterThanOrEqual(9)
    expect(cases.filter((c) => c.locale === 'en').length).toBeGreaterThanOrEqual(9)
    for (const mode of [
      'greeting',
      'opinion',
      'frustration',
      'geo',
      'product',
      'employer',
      'price',
      'compare',
      'followup',
    ] as const) {
      expect(cases.some((c) => c.mode === mode && c.locale === 'de')).toBe(true)
      expect(cases.some((c) => c.mode === mode && c.locale === 'en')).toBe(true)
    }
  })
})

describe('scorePersonaChatCase', () => {
  const greeting = getPersonaChatEvalCase('de-greeting-01')!
  const geoEn = getPersonaChatEvalCase('en-geo-01')!

  it('passes a clean short DE greeting', () => {
    const result = scorePersonaChatCase(
      greeting,
      'Passt soweit. Hab gerade wenig Zeit — schieß los.',
    )
    expect(result.passed).toBe(true)
    expect(result.wordCount).toBeLessThanOrEqual(45)
  })

  it('fails on emoji residue', () => {
    const result = scorePersonaChatCase(greeting, 'Mir gehts gut 👍')
    expect(result.checks.find((c) => c.id === 'noEmoji')?.passed).toBe(false)
    expect(result.passed).toBe(false)
  })

  it('fails on interview closer', () => {
    const result = scorePersonaChatCase(greeting, 'Ganz ok. Und bei dir?')
    expect(result.checks.find((c) => c.id === 'noInterviewCloser')?.passed).toBe(false)
  })

  it('fails on coach offer', () => {
    const result = scorePersonaChatCase(
      greeting,
      'Passt. Wenn du willst formuliere ich das anders.',
    )
    expect(result.checks.find((c) => c.id === 'noCoachOffer')?.passed).toBe(false)
  })

  it('fails on category labels', () => {
    const result = scorePersonaChatCase(
      geoEn,
      'Here are questions:\n1. Price?\nU = unbranded category',
    )
    expect(result.checks.find((c) => c.id === 'noCategoryLabels')?.passed).toBe(false)
  })

  it('fails when numbered GEO list exceeds cap (dot or paren markers)', () => {
    const longList = Array.from({ length: 8 }, (_, i) => `${i + 1}) Question ${i + 1}?`).join(
      '\n',
    )
    const reply = `I'd ask a few things.\n${longList}`
    expect(countNumberedItems(reply)).toBe(8)
    const result = scorePersonaChatCase(geoEn, reply)
    expect(result.checks.find((c) => c.id === 'maxNumbered')?.passed).toBe(false)
  })

  it('counts both 1. and 1) list markers', () => {
    expect(countNumberedItems('1. a\n2. b')).toBe(2)
    expect(countNumberedItems('1) a\n2) b')).toBe(2)
  })

  it('fails locale mismatch', () => {
    const enGreeting = getPersonaChatEvalCase('en-greeting-01')!
    const result = scorePersonaChatCase(
      enGreeting,
      'Mir geht es gut, danke. Gerade eher ruhig unterwegs.',
    )
    expect(result.checks.find((c) => c.id === 'localeMatch')?.passed).toBe(false)
  })

  it('summarizes pass rate', () => {
    const a = scorePersonaChatCase(greeting, 'Passt. Kurz beschäftigt.')
    const b = scorePersonaChatCase(greeting, 'Alles gut 😀 und bei dir?')
    const summary = summarizeEvalResults([a, b])
    expect(summary.total).toBe(2)
    expect(summary.passed).toBe(1)
    expect(summary.failed).toBe(1)
    expect(summary.passRate).toBe(0.5)
  })
})

describe('eval helpers', () => {
  it('counts words and numbered items', () => {
    expect(countWords('one two three')).toBe(3)
    expect(countNumberedItems('1. a\n2. b\nplain')).toBe(2)
  })

  it('detects reply locale', () => {
    expect(detectReplyLocale('Mir geht es gut und ich bin da')).toBe('de')
    expect(detectReplyLocale('I am fine and you are okay with that')).toBe('en')
  })
})
