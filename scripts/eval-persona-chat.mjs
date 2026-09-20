#!/usr/bin/env node
/**
 * Live bilingual persona-chat human-likeness eval against staging (or local).
 *
 * Auth: Bearer AUDION_API_TOKEN
 * Base: AUDION_V3_BASE_URL (default URL_AUDION_V3)
 * Optional: EVAL_PERSONA_ID · EVAL_PROJECT_ID
 *
 * Usage:
 *   AUDION_API_TOKEN=audion_… node scripts/eval-persona-chat.mjs
 *
 * Writes: .tmp/persona-chat-eval/latest.json
 * Spec: specs/domain/persona-chat-eval.md · knowledge/persona-chat-eval.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, '.tmp', 'persona-chat-eval')
const catalogPath = join(root, 'apps/web/lib/chat/eval/catalog.json')

const DEFAULT_BASE = 'https://audion-v3.projects-a.plygrnd.tech'
const base = (process.env.AUDION_V3_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
const token = process.env.AUDION_API_TOKEN?.trim()
const onlyId = process.env.EVAL_CASE_ID?.trim() || ''
const gateRate = Number(process.env.EVAL_PASS_RATE_GATE || '0.9')

if (!token) {
  console.error('Missing AUDION_API_TOKEN (Bearer audion_…).')
  process.exit(1)
}
if (!token.startsWith('audion_')) {
  console.error('AUDION_API_TOKEN must start with audion_')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

/** Inline scorers (mirror apps/web/lib/chat/eval/scorers.ts) for zero-build ops. */
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u
const INTERVIEW_RE = {
  de: /und bei dir\??|was ist mit dir\??|bei dir\s*[—–-]/i,
  en: /how about you\??|what about you\??|and you\??\s*$/i,
}
const COACH_RE = {
  de: /wenn du willst|sag mir kurz|formuliere ich/i,
  en: /if you want i can|if you'd like i can|just tell me briefly/i,
}
const CATEGORY_RE =
  /(?:\bU\s*=|\bBV\s*=|\bBR\s*=|unbranded|reputationscheck|branded\s*\/\s*compare|#{1,3}\s)/i
const DE_SIGNAL =
  /[äöüÄÖÜß]|\b(ich|und|nicht|das|die|der|ist|mit|für|auch|noch|wenn|aber|oder|eine|einen)\b/gi
const EN_SIGNAL =
  /\b(the|and|you|what|how|are|that|with|for|this|have|would|about|from|not|but)\b/gi

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function countNumberedItems(text) {
  return (String(text || '').match(/^\s*\d+[.)]\s+/gm) || []).length
}

function detectReplyLocale(text) {
  const t = String(text || '')
  const de = (t.match(DE_SIGNAL) || []).length
  const en = (t.match(EN_SIGNAL) || []).length
  return en > de ? 'en' : 'de'
}

function scoreCase(evalCase, reply) {
  const text = String(reply || '').trim()
  const checks = []
  const locale = evalCase.locale
  const exp = evalCase.expectations || {}
  const words = countWords(text)
  checks.push({
    id: 'maxWords',
    passed: words <= exp.maxWords,
    detail: `${words} words (max ${exp.maxWords})`,
  })
  for (const tag of exp.forbid || []) {
    if (tag === 'emoji') {
      const hit = EMOJI_RE.test(text)
      checks.push({ id: 'noEmoji', passed: !hit, detail: hit ? 'emoji found' : 'ok' })
    } else if (tag === 'interview') {
      const hit =
        INTERVIEW_RE[locale].test(text) ||
        INTERVIEW_RE.de.test(text) ||
        INTERVIEW_RE.en.test(text)
      checks.push({
        id: 'noInterviewCloser',
        passed: !hit,
        detail: hit ? 'interview closer found' : 'ok',
      })
    } else if (tag === 'category') {
      const hit = CATEGORY_RE.test(text)
      checks.push({
        id: 'noCategoryLabels',
        passed: !hit,
        detail: hit ? 'category/method label found' : 'ok',
      })
    } else if (tag === 'coach') {
      const hit =
        COACH_RE[locale].test(text) || COACH_RE.de.test(text) || COACH_RE.en.test(text)
      checks.push({
        id: 'noCoachOffer',
        passed: !hit,
        detail: hit ? 'coach offer found' : 'ok',
      })
    }
  }
  if (typeof exp.maxNumbered === 'number') {
    const n = countNumberedItems(text)
    checks.push({
      id: 'maxNumbered',
      passed: n <= exp.maxNumbered,
      detail: `${n} numbered items (max ${exp.maxNumbered})`,
    })
  }
  if (exp.requireLocaleMatch !== false) {
    const got = detectReplyLocale(text)
    checks.push({
      id: 'localeMatch',
      passed: got === locale,
      detail: `detected ${got} (expected ${locale})`,
    })
  }
  return {
    caseId: evalCase.id,
    locale,
    mode: evalCase.mode,
    passed: checks.every((c) => c.passed),
    wordCount: words,
    checks,
    replyPreview: text.slice(0, 280),
    reply: text,
  }
}

async function getJson(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'manual',
  })
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Auth redirect on ${path}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${path}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function streamChat({ personaId, projectId, message }) {
  const res = await fetch(`${base}/api/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      personaId,
      projectId: projectId || null,
      message,
    }),
    redirect: 'manual',
  })
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Auth redirect on /api/chat/stream`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} stream: ${body.slice(0, 200)}`)
  }
  const raw = await res.text()
  let full = ''
  let error = null
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let event
    try {
      event = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (event.type === 'delta' && event.text) full += event.text
    if (event.type === 'error') error = event.message || 'stream error'
  }
  if (error) throw new Error(error)
  return full
}

async function resolvePersonaAndProject() {
  let personaId = process.env.EVAL_PERSONA_ID?.trim() || ''
  let projectId = process.env.EVAL_PROJECT_ID?.trim() || ''

  if (!personaId || !projectId) {
    const conversations = await getJson('/api/chat/conversations').catch(() => ({ items: [] }))
    const items = conversations.items || []
    const preferred =
      items.find((c) => /vaillant|lisa|michael|geo/i.test(`${c.personaName || ''} ${c.title || ''}`)) ||
      items[0]
    if (!personaId) {
      if (!preferred?.personaId) {
        throw new Error('No conversations with personaId; set EVAL_PERSONA_ID')
      }
      personaId = preferred.personaId
    }
    if (!projectId) {
      projectId = preferred?.projectId || ''
    }
  }

  if (!personaId) {
    const personas = await getJson('/api/personas').catch(() => ({ items: [] }))
    const items = personas.items || []
    const preferred =
      items.find((p) => /vaillant|geo|lab|alex/i.test(p.name || p.id || '')) || items[0]
    if (!preferred?.id) throw new Error('No personas available; set EVAL_PERSONA_ID')
    personaId = preferred.id
  }

  if (!projectId) {
    const projects = await getJson('/api/projects').catch(() => ({ items: [] }))
    const items = projects.items || []
    projectId = items[0]?.id || ''
  }

  return { personaId, projectId }
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
  const cases = onlyId ? catalog.filter((c) => c.id === onlyId) : catalog
  if (!cases.length) throw new Error(`No eval cases (EVAL_CASE_ID=${onlyId || '—'})`)

  const { personaId, projectId } = await resolvePersonaAndProject()
  console.log(`Base: ${base}`)
  console.log(`Persona: ${personaId}`)
  console.log(`Project: ${projectId || '(none)'}`)
  console.log(`Cases: ${cases.length}`)

  const results = []
  for (const evalCase of cases) {
    process.stdout.write(`  ${evalCase.id} … `)
    try {
      const reply = await streamChat({
        personaId,
        projectId,
        message: evalCase.prompt,
      })
      const scored = scoreCase(evalCase, reply)
      results.push(scored)
      console.log(scored.passed ? 'PASS' : 'FAIL', `(${scored.wordCount}w)`)
      if (!scored.passed) {
        for (const c of scored.checks.filter((x) => !x.passed)) {
          console.log(`    - ${c.id}: ${c.detail}`)
        }
      }
    } catch (err) {
      const scored = {
        caseId: evalCase.id,
        locale: evalCase.locale,
        mode: evalCase.mode,
        passed: false,
        wordCount: 0,
        checks: [{ id: 'maxWords', passed: false, detail: String(err.message || err) }],
        replyPreview: '',
        reply: '',
        error: String(err.message || err),
      }
      results.push(scored)
      console.log('ERROR', err.message || err)
    }
  }

  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const passRate = total ? passed / total : 0
  const report = {
    at: new Date().toISOString(),
    base,
    personaId,
    projectId: projectId || null,
    total,
    passed,
    failed: total - passed,
    passRate,
    gate: gateRate,
    gatePassed: passRate >= gateRate,
    results: results.map(({ reply, ...rest }) => rest),
  }

  const outPath = join(outDir, 'latest.json')
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`\nPass rate: ${(passRate * 100).toFixed(0)}% (${passed}/${total})`)
  console.log(`Wrote ${outPath}`)
  if (!report.gatePassed) {
    console.error(`Below gate ${(gateRate * 100).toFixed(0)}% — investigate before client demos.`)
    process.exit(2)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
