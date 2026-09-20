#!/usr/bin/env node
/**
 * Export all persona chat conversations from AUDION v3 staging (or local).
 *
 * Auth: Bearer AUDION_API_TOKEN (Coolify env or Settings → Admin → Tokens).
 * Base: AUDION_V3_BASE_URL (default from knowledge/deploy-urls.md → URL_AUDION_V3).
 *
 * Usage:
 *   AUDION_API_TOKEN=audion_… node scripts/export-persona-chats.mjs
 *   AUDION_API_TOKEN=audion_… AUDION_V3_BASE_URL=http://127.0.0.1:3006 node scripts/export-persona-chats.mjs
 *
 * Writes:
 *   .tmp/persona-chats/conversations.json   — full dump
 *   .tmp/persona-chats/analysis.json        — aggregates
 *   knowledge/persona-chat-corpus-analysis.md — human summary (overwrite)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, '.tmp', 'persona-chats')
const knowledgePath = join(root, 'knowledge', 'persona-chat-corpus-analysis.md')

const DEFAULT_BASE = 'https://audion-v3.projects-a.plygrnd.tech'
const base = (process.env.AUDION_V3_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
const token = process.env.AUDION_API_TOKEN?.trim()

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
}

async function getJson(path) {
  const url = `${base}${path}`
  const res = await fetch(url, { headers, redirect: 'manual' })
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Auth redirect on ${path} → ${res.headers.get('location')}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${path}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

function countRoles(messages = []) {
  let user = 0
  let assistant = 0
  let system = 0
  for (const m of messages) {
    if (m.role === 'user') user++
    else if (m.role === 'assistant') assistant++
    else if (m.role === 'system') system++
  }
  return { user, assistant, system, total: messages.length }
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function extractThemes(messages = []) {
  /** Lightweight keyword buckets for first-pass corpus scan (DE/EN). */
  const buckets = {
    price_cost: /\b(preis|kosten|teuer|günstig|budget|€|euro|price|cost|cheap|expensive)\b/i,
    trust_brand: /\b(vertrauen|marke|seriös|glaubwürdig|brand|trust|reputat)/i,
    product_tech: /\b(produkt|technik|feature|funktion|motor|heizung|wärmepumpe|ebike|product|tech)\b/i,
    ux_web: /\b(website|seite|navigation|klick|menü|formular|checkout|ux|ui|page)\b/i,
    decision: /\b(entscheiden|entscheidung|vergleich|alternative|wählen|decide|compare|choice)\b/i,
    emotion: /\b(frustriert|ärger|unsicher|freude|stress|angst|nervös|frustrat|anxi|confus)/i,
    journey_inspect: /\b(inspect|journey|website prüfen|url|https?:\/\/)/i,
  }
  const hits = Object.fromEntries(Object.keys(buckets).map((k) => [k, 0]))
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue
    for (const [k, re] of Object.entries(buckets)) {
      if (re.test(m.content || '')) hits[k]++
    }
  }
  return hits
}

function mdEscape(s) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  console.log(`Base: ${base}`)

  const [list, projects, personas] = await Promise.all([
    getJson('/api/chat/conversations'),
    getJson('/api/projects').catch(() => ({ items: [] })),
    getJson('/api/personas').catch(() => ({ items: [] })),
  ])

  const projectById = new Map(
    (projects.items || projects || []).map((p) => [p.id, p]),
  )
  const personaById = new Map(
    (personas.items || personas || []).map((p) => [p.id, p]),
  )

  const summaries = list.items || []
  console.log(`Conversations: ${summaries.length}`)

  const details = []
  for (const s of summaries) {
    const detail = await getJson(`/api/chat/conversations/${encodeURIComponent(s.id)}`)
    details.push(detail)
    process.stdout.write('.')
  }
  console.log('')

  const byProject = new Map()
  const byPersona = new Map()
  let totalUserTurns = 0
  let totalAssistantTurns = 0
  let withInspect = 0
  let withImages = 0
  let withDocs = 0
  const themeTotals = {
    price_cost: 0,
    trust_brand: 0,
    product_tech: 0,
    ux_web: 0,
    decision: 0,
    emotion: 0,
    journey_inspect: 0,
  }
  const userQuestions = []

  for (const c of details) {
    const roles = countRoles(c.messages)
    totalUserTurns += roles.user
    totalAssistantTurns += roles.assistant
    if (c.inspect) withInspect++
    if ((c.messages || []).some((m) => (m.images || []).length > 0)) withImages++
    if ((c.messages || []).some((m) => (m.documents || []).length > 0)) withDocs++

    const themes = extractThemes(c.messages)
    for (const [k, v] of Object.entries(themes)) themeTotals[k] += v

    const projectId = c.projectId || '—none—'
    const projectName =
      projectById.get(c.projectId)?.name ||
      personaById.get(c.personaId)?.projectName ||
      projectId
    const personaName =
      c.personaName || personaById.get(c.personaId)?.name || c.personaId

    if (!byProject.has(projectId)) {
      byProject.set(projectId, {
        projectId,
        projectName,
        conversations: 0,
        userTurns: 0,
        personas: new Set(),
      })
    }
    const pj = byProject.get(projectId)
    pj.conversations++
    pj.userTurns += roles.user
    pj.personas.add(personaName)

    const pk = c.personaId
    if (!byPersona.has(pk)) {
      byPersona.set(pk, {
        personaId: pk,
        personaName,
        projectId: c.projectId,
        projectName,
        conversations: 0,
        userTurns: 0,
        avgWordsUser: 0,
        _userWords: 0,
      })
    }
    const pe = byPersona.get(pk)
    pe.conversations++
    pe.userTurns += roles.user

    for (const m of c.messages || []) {
      if (m.role === 'user' && m.content?.trim()) {
        pe._userWords += wordCount(m.content)
        userQuestions.push({
          conversationId: c.id,
          personaId: c.personaId,
          personaName,
          projectId: c.projectId,
          projectName,
          createdAt: m.createdAt,
          text: m.content.trim().slice(0, 500),
        })
      }
    }
  }

  for (const pe of byPersona.values()) {
    pe.avgWordsUser = pe.userTurns ? Math.round(pe._userWords / pe.userTurns) : 0
    delete pe._userWords
  }

  const projectRows = [...byProject.values()]
    .map((p) => ({
      ...p,
      personas: [...p.personas].sort(),
      personaCount: p.personas.size,
    }))
    .sort((a, b) => b.conversations - a.conversations)

  const personaRows = [...byPersona.values()].sort(
    (a, b) => b.conversations - a.conversations,
  )

  const analysis = {
    exportedAt: new Date().toISOString(),
    base,
    totals: {
      conversations: details.length,
      userTurns: totalUserTurns,
      assistantTurns: totalAssistantTurns,
      withInspect,
      withImages,
      withDocs,
      uniquePersonas: byPersona.size,
      uniqueProjects: byProject.size,
    },
    themeMessageHits: themeTotals,
    byProject: projectRows,
    byPersona: personaRows,
    sampleUserTurns: userQuestions.slice(0, 80),
  }

  writeFileSync(
    join(outDir, 'conversations.json'),
    JSON.stringify({ exportedAt: analysis.exportedAt, base, items: details }, null, 2),
  )
  writeFileSync(join(outDir, 'analysis.json'), JSON.stringify(analysis, null, 2))

  const lines = []
  lines.push('# Persona chat corpus analysis (AUDION v3)')
  lines.push('')
  lines.push(`**Exported:** ${analysis.exportedAt}`)
  lines.push(`**Source:** \`${base}\` → \`/api/chat/conversations\` (Postgres \`chat_conversations\`)`)
  lines.push(`**Raw dump:** \`.tmp/persona-chats/conversations.json\``)
  lines.push('')
  lines.push('## Totals')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|------:|')
  lines.push(`| Conversations | ${analysis.totals.conversations} |`)
  lines.push(`| User turns | ${analysis.totals.userTurns} |`)
  lines.push(`| Assistant turns | ${analysis.totals.assistantTurns} |`)
  lines.push(`| Unique personas | ${analysis.totals.uniquePersonas} |`)
  lines.push(`| Unique projects | ${analysis.totals.uniqueProjects} |`)
  lines.push(`| With website inspect | ${analysis.totals.withInspect} |`)
  lines.push(`| With image attachments | ${analysis.totals.withImages} |`)
  lines.push(`| With document attachments | ${analysis.totals.withDocs} |`)
  lines.push('')
  lines.push('## By project')
  lines.push('')
  lines.push('| Project | Conversations | User turns | Personas |')
  lines.push('|---------|--------------:|-----------:|----------|')
  for (const p of projectRows) {
    lines.push(
      `| ${mdEscape(p.projectName)} | ${p.conversations} | ${p.userTurns} | ${mdEscape(p.personas.join(', '))} |`,
    )
  }
  lines.push('')
  lines.push('## By persona')
  lines.push('')
  lines.push('| Persona | Project | Conversations | User turns | Avg user words |')
  lines.push('|---------|---------|--------------:|-----------:|---------------:|')
  for (const p of personaRows) {
    lines.push(
      `| ${mdEscape(p.personaName)} | ${mdEscape(p.projectName)} | ${p.conversations} | ${p.userTurns} | ${p.avgWordsUser} |`,
    )
  }
  lines.push('')
  lines.push('## Theme keyword hits (message-level, first pass)')
  lines.push('')
  lines.push('| Theme | Hits |')
  lines.push('|-------|-----:|')
  for (const [k, v] of Object.entries(themeTotals).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push('')
  lines.push('## Sample user turns (first 40)')
  lines.push('')
  for (const q of userQuestions.slice(0, 40)) {
    lines.push(`- **${mdEscape(q.personaName)}** (${mdEscape(q.projectName)}): ${mdEscape(q.text)}`)
  }
  lines.push('')
  lines.push('## Method notes')
  lines.push('')
  lines.push('- Persistence: `chat_conversations` when `DATABASE_URL` is set (`knowledge/plexon-federation.md`).')
  lines.push('- TG / project ask-all rounds are ephemeral UI and are **not** rows here.')
  lines.push('- Theme buckets are keyword heuristics for triage; deepen with quote-grounded thematic coding if needed.')
  lines.push('')

  writeFileSync(knowledgePath, lines.join('\n'))
  console.log(`Wrote ${join(outDir, 'conversations.json')}`)
  console.log(`Wrote ${join(outDir, 'analysis.json')}`)
  console.log(`Wrote ${knowledgePath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
