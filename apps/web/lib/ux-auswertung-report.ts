/**
 * Testbirds-parallel EBM Auswertung markdown from evaluation JSON.
 * @see specs/domain/ebm-evaluation-export.md
 */

export type EbmSoftScoreEntry = {
  scale?: string
  value?: number | string | null
  confidence?: number
  rationale?: string
  choices?: unknown
}

export type EbmHypothesis = {
  id: string
  statement: string
  verdict: string
  confidence: number
  score?: number | null
  evidenceRunIds?: string[]
  rationale?: string
}

export type EbmEvaluationRun = {
  runId: string
  leitfadenBlock?: string | null
  persona?: string | null
  personaId?: string | null
  segment?: string | null
  studyId?: string | null
  waveId?: string | null
  jobId?: string | null
  steps?: number | null
  frictionScore?: number | null
  goalReached?: boolean | null
  taskCompleted?: boolean | null
  validEvidence?: boolean | null
  finalUrl?: string | null
  deeplinkCheat?: boolean | null
  finding?: string | null
  actions?: string[]
}

export type EbmEvaluationExport = {
  schemaVersion?: string
  studyId?: string
  waveId?: string
  evaluatedAt?: string | null
  method?: string
  sourceGuide?: string
  targetUrlKey?: string
  agentCommit?: string
  agentBaseline?: string
  audionProjectId?: string
  audionBaseUrl?: string
  agentBaseUrl?: string
  notes?: string[]
  runs?: EbmEvaluationRun[]
  aggregate?: Record<string, unknown>
  hypotheses?: EbmHypothesis[]
  softScores?: Record<string, EbmSoftScoreEntry | string | undefined> & { basis?: string }
  leitfadenQuestionCoverage?: Record<string, string>
}

const VERDICT_AMPEL: Record<string, string> = {
  supported: '🔴',
  confirmed: '🔴',
  partially_supported: '🟡',
  partial: '🟡',
  not_supported: '🟢',
  rejected: '🟢',
  not_tested: '⚪',
  inconclusive: '🟡',
}

function ampelFor(verdict: string, confidence: number): string {
  const v = String(verdict || '').toLowerCase()
  if (VERDICT_AMPEL[v]) return VERDICT_AMPEL[v]
  if (v.includes('partial')) return '🟡'
  if (v.includes('support') || v.includes('confirm')) {
    return confidence >= 0.7 ? '🔴' : '🟡'
  }
  return '⚪'
}

function softValue(entry: EbmSoftScoreEntry | string | undefined): string {
  if (!entry || typeof entry === 'string') return '—'
  if (entry.value === null || entry.value === undefined || entry.value === '') return '—'
  return String(entry.value)
}

/**
 * Build Auswertung markdown parallel to Testbirds Human-PDF structure.
 */
export function buildEbmAuswertungMarkdown(evalDoc: EbmEvaluationExport): string {
  const runs = evalDoc.runs ?? []
  const personas = [...new Set(runs.map((r) => r.persona).filter(Boolean))]
  const lines: string[] = [
    `# Auswertung UX Test ‚Produktkombinationen & Nachrüsten‘ — AUDION AI`,
    ``,
    `**Unmoderierter Nutzertest (AI-Reproduktion)**`,
    `Mischung aus Leitfaden-Fragen und agentischen Think-Alouds (Persona Lab) zum Bosch eBike Produktkombinationen-Tool.`,
    ``,
    `| | |`,
    `|--|--|`,
    `| **Methode** | ${(evalDoc.method || 'audion_ux_journey_agent').replace(/_/g, ' ')} · ${personas.join(' · ') || 'Persona Lab'} |`,
    `| **Stichprobe** | ${runs.length} AI-Runs · Desktop Chromium |`,
    `| **Datum** | ${(evalDoc.evaluatedAt || '').slice(0, 10) || '—'} |`,
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
      `| **${h.id}** | ${h.statement.replace(/\|/g, '/')} | ${ampelFor(h.verdict, h.confidence)} | ${h.verdict} | ${h.confidence} | ${(h.rationale || '—').replace(/\|/g, '/').slice(0, 160)} |`,
    )
  }

  lines.push(``, `---`, ``, `## Soft-Q`, ``)
  if (evalDoc.softScores?.basis) {
    lines.push(`*Basis:* ${evalDoc.softScores.basis}`, ``)
  }
  lines.push(`| Key | Value | Conf | Rationale |`, `|-----|-------|------|-----------|`)
  for (const [key, entry] of Object.entries(evalDoc.softScores ?? {})) {
    if (key === 'basis' || !entry || typeof entry === 'string') continue
    const e = entry as EbmSoftScoreEntry
    lines.push(
      `| ${key} | ${softValue(e)} | ${e.confidence ?? '—'} | ${(e.rationale || '—').replace(/\|/g, '/').slice(0, 140)} |`,
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
    lines.push(`### ${r.runId}`, ``, r.finding?.trim() || '_kein Finding_', ``)
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
    `*Generiert via \`buildEbmAuswertungMarkdown\` · schema ${evalDoc.schemaVersion || '1.0.0'}*`,
    ``,
  )

  return lines.join('\n')
}
