#!/usr/bin/env node
/**
 * Export Testbirds-parallel EBM Auswertung markdown from evaluation JSON.
 *
 * Usage:
 *   node scripts/export-ebm-auswertung.mjs \
 *     --input knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json \
 *     --out /tmp/ebm-auswertung.md
 *
 * Optional: --pdf (requires pandoc on PATH)
 *
 * Spec: specs/domain/ebm-evaluation-export.md
 * TS twin (Vitest): apps/web/lib/ux-auswertung-report.ts
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const VERDICT_AMPEL = {
  supported: '🔴',
  confirmed: '🔴',
  partially_supported: '🟡',
  partial: '🟡',
  not_supported: '🟢',
  rejected: '🟢',
  not_tested: '⚪',
  inconclusive: '🟡',
}

function ampelFor(verdict, confidence) {
  const v = String(verdict || '').toLowerCase()
  if (VERDICT_AMPEL[v]) return VERDICT_AMPEL[v]
  if (v.includes('partial')) return '🟡'
  if (v.includes('support') || v.includes('confirm')) {
    return confidence >= 0.7 ? '🔴' : '🟡'
  }
  return '⚪'
}

function softValue(entry) {
  if (!entry || typeof entry === 'string') return '—'
  if (entry.value === null || entry.value === undefined || entry.value === '') return '—'
  return String(entry.value)
}

/** Mirror of apps/web/lib/ux-auswertung-report.ts — keep in sync. */
export function buildEbmAuswertungMarkdown(evalDoc) {
  const runs = evalDoc.runs ?? []
  const personas = [...new Set(runs.map((r) => r.persona).filter(Boolean))]
  const lines = [
    `# Auswertung UX Test ‚Produktkombinationen & Nachrüsten‘ — AUDION AI`,
    ``,
    `**Unmoderierter Nutzertest (AI-Reproduktion)**`,
    `Mischung aus Leitfaden-Fragen und agentischen Think-Alouds (Persona Lab) zum Bosch eBike Produktkombinationen-Tool.`,
    ``,
    `| | |`,
    `|--|--|`,
    `| **Methode** | ${String(evalDoc.method || 'audion_ux_journey_agent').replace(/_/g, ' ')} · ${personas.join(' · ') || 'Persona Lab'} |`,
    `| **Stichprobe** | ${runs.length} AI-Runs · Desktop Chromium |`,
    `| **Datum** | ${String(evalDoc.evaluatedAt || '').slice(0, 10) || '—'} |`,
    `| **Agent** | \`${evalDoc.agentCommit || '—'}\` · \`${evalDoc.agentBaseline || '—'}\` |`,
    `| **Staging** | ${evalDoc.audionBaseUrl || '—'} · Agent ${evalDoc.agentBaseUrl || '—'} |`,
    `| **Projekt** | \`${evalDoc.audionProjectId || '—'}\` |`,
    `| **Leitfaden** | ${evalDoc.sourceGuide || '—'} |`,
    `| **Wave** | \`${evalDoc.waveId || '—'}\` |`,
    `| **Study** | \`${evalDoc.studyId || '—'}\` |`,
    ``,
  ]

  if (evalDoc.notes?.length) {
    lines.push(`**Hinweise:** ${evalDoc.notes.join(' ')}`, ``)
  }

  lines.push(
    `---`,
    ``,
    `## Methodik: Wie wir die Auswertung durchgeführt haben`,
    ``,
    `### SCHRITT 1 — Auswertung der Runs`,
    `${runs.length} Agent-Runs sortiert nach Leitfaden-Blöcken. Pro Run: Finding, Friction, Goal, finalUrl.`,
    ``,
    `### SCHRITT 2 — Queranalysen & Hypothesen`,
    `Hypothesen-Validierung mit Ampel (wie Human-PDF). Soft-Q aus Evaluate / evidenzbasiertem Draft.`,
    ``,
    `### SCHRITT 3 — Handlungsempfehlungen`,
    `Ableitung aus Hypothesen + Soft-Q (Quick Win / Mittelfristig). AI misst ehrliche Abbruchmuster.`,
    ``,
    `---`,
    ``,
    `## Selbsteinschätzung der „Probanden“ (AI-Persona)`,
    ``,
    `| Merkmal | AI Wave |`,
    `|---------|---------|`,
    `| Personas | ${personas.join(', ') || '—'} |`,
    `| Runs | ${runs.map((r) => `${r.runId} ${r.steps ?? '—'}st`).join(' · ') || '—'} |`,
    `| Segmente | ${[...new Set(runs.map((r) => r.segment).filter(Boolean))].join(', ') || '—'} |`,
    ``,
    `---`,
    ``,
    `## Validierung Hypothesen`,
    ``,
    `**Legende:** 🟢 geringer Handlungsbedarf · 🟡 Anpassungen · 🔴 kritisch · ⚪ nicht getestet`,
    ``,
    `| ID | Hypothese | Ampel | Verdict | Konfidenz | Kernerkenntnis |`,
    `|----|-----------|-------|---------|-----------|----------------|`,
  )

  for (const h of evalDoc.hypotheses ?? []) {
    lines.push(
      `| **${h.id}** | ${String(h.statement).replace(/\|/g, '/')} | ${ampelFor(h.verdict, h.confidence)} | ${h.verdict} | ${h.confidence} | ${String(h.rationale || '—').replace(/\|/g, '/').slice(0, 160)} |`,
    )
  }

  lines.push(``, `---`, ``, `## Soft-Q`, ``)
  if (evalDoc.softScores?.basis) {
    lines.push(`*Basis:* ${evalDoc.softScores.basis}`, ``)
  }
  lines.push(`| Key | Value | Conf | Rationale |`, `|-----|-------|------|-----------|`)
  for (const [key, entry] of Object.entries(evalDoc.softScores ?? {})) {
    if (key === 'basis' || !entry || typeof entry === 'string') continue
    lines.push(
      `| ${key} | ${softValue(entry)} | ${entry.confidence ?? '—'} | ${String(entry.rationale || '—').replace(/\|/g, '/').slice(0, 140)} |`,
    )
  }

  lines.push(``, `---`, ``, `## Job-IDs & Artefakte`, ``)
  lines.push(
    `| Run | jobId | Steps | Friction | Valid | Goal | Deeplink |`,
    `|-----|-------|-------|----------|-------|------|----------|`,
  )
  for (const r of runs) {
    lines.push(
      `| ${r.runId} | \`${r.jobId || '—'}\` | ${r.steps ?? '—'} | ${r.frictionScore ?? '—'} | ${r.validEvidence === true ? 'ja' : 'nein'} | ${r.goalReached === true ? 'ja' : 'nein'} | ${r.deeplinkCheat === true ? 'ja' : r.deeplinkCheat === false ? 'nein' : '—'} |`,
    )
  }

  const agg = evalDoc.aggregate ?? {}
  lines.push(
    ``,
    `---`,
    ``,
    `## Aggregate`,
    ``,
    `- runsTotal: ${String(agg.runsTotal ?? runs.length)}`,
    `- validEvidenceRate: ${String(agg.validEvidenceRate ?? '—')}`,
    `- deeplinkCheatRate: ${String(agg.deeplinkCheatRate ?? '—')}`,
    `- navH3Pass: ${String(agg.navH3Pass ?? '—')}`,
    `- meanFrictionValidOnly: ${String(agg.meanFrictionValidOnly ?? '—')}`,
    ``,
    `## Findings (Kurz)`,
    ``,
  )
  for (const r of runs) {
    lines.push(`### ${r.runId}`, ``, (r.finding || '').trim() || '_kein Finding_', ``)
  }

  lines.push(
    `---`,
    ``,
    `## Handlungsempfehlungen`,
    ``,
    `### Quick Wins`,
    `1. Erklären warum ausgegraut (Tooltip/Inline) — H2.`,
    `2. Schrittfolge visualisieren — Filterlogik.`,
    `3. Nav: Einstieg nicht nur „Service & Beratung“ — H3/Q4.`,
    ``,
    `### AI-Retest Gates`,
    `1. Nav-Landing ohne Deep-Link-Cheat.`,
    `2. Sam patient + Alex impatient auf Lab B (Dual-Persona Default).`,
    `3. Soft-Q Evaluate (L6/L6b) befüllt Q2/Q3 bei confusion/friction.`,
    ``,
    `---`,
    ``,
    `*Generiert via \`export-ebm-auswertung.mjs\` · schema ${evalDoc.schemaVersion || '1.0.0'}*`,
    ``,
  )

  return lines.join('\n')
}

function parseArgs(argv) {
  const out = { input: null, out: null, pdf: false, help: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--input' || a === '-i') out.input = argv[++i]
    else if (a === '--out' || a === '-o') out.out = argv[++i]
    else if (a === '--pdf') out.pdf = true
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

function main() {
  const args = parseArgs(process.argv)
  if (args.help || !args.input) {
    console.log(`Usage: node scripts/export-ebm-auswertung.mjs --input <eval.json> [--out <file.md>] [--pdf]

See specs/domain/ebm-evaluation-export.md`)
    process.exit(args.help ? 0 : 1)
  }

  const inputPath = resolve(root, args.input)
  const evalDoc = JSON.parse(readFileSync(inputPath, 'utf8'))
  const markdown = buildEbmAuswertungMarkdown(evalDoc)

  const outPath = args.out
    ? resolve(process.cwd(), args.out.startsWith('/') ? args.out : resolve(root, args.out))
    : resolve(root, 'knowledge', `ebm-auswertung-export-${Date.now().toString(36)}.md`)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, markdown, 'utf8')
  console.log(`Wrote ${outPath}`)

  if (args.pdf) {
    const pdfPath = outPath.replace(/\.md$/i, '.pdf')
    const pandoc = spawnSync('pandoc', [outPath, '-o', pdfPath], { encoding: 'utf8' })
    if (pandoc.status !== 0) {
      console.error('pandoc failed (is it installed?):', pandoc.stderr || pandoc.stdout)
      process.exit(1)
    }
    console.log(`Wrote ${pdfPath}`)
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
