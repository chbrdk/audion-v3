/**
 * Lab L6 — draft Soft-Q scores from validEvidence Think-Aloud / findings.
 * Deterministic (no LLM): fills empty Soft-Q keys toward the human EBM band
 * when confusion / high friction shows up in narratives.
 *
 * @see knowledge/lab-l6-soft-q-draft-2026-08-03.md
 */

import type { SoftScoreEntry, SoftScoreKey, UxWaveRunItem } from '@audion-v3/contracts'
import {
  hasConfusionSignal,
  PERSONA_LAB_OPTIMISTIC_RES,
} from './persona-lab-correlate'

const SCALE_1_5 = '1-5'
const SCALE_CHOICE = 'choice'
const SCALE_NOTE = '1-6_schulnote'

function soft(
  scale: string,
  value: number | string | null,
  confidence: number,
  rationale: string,
): SoftScoreEntry {
  return { scale, value, confidence, rationale }
}

function clip(text: string, limit = 220): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= limit) return t
  return `${t.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function narrativeFromRun(run: UxWaveRunItem): string {
  return [run.finding, run.validEvidenceCaveat].filter(Boolean).join('\n')
}

function quoteSnippet(runs: UxWaveRunItem[]): string {
  for (const run of runs) {
    const text = narrativeFromRun(run)
    if (!text.trim()) continue
    const sentence =
      text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .find((s) => s.length >= 40) ?? text
    return clip(sentence)
  }
  return 'validEvidence-Run ohne ausführliches Finding'
}

function meanFriction(runs: UxWaveRunItem[]): number | null {
  const nums = runs
    .map((r) => r.frictionScore)
    .filter((n): n is number => typeof n === 'number')
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function anyOptimistic(text: string): boolean {
  return PERSONA_LAB_OPTIMISTIC_RES.some((re) => re.test(text))
}

function clamp15(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)))
}

export type SoftQDraft = Partial<Record<SoftScoreKey, SoftScoreEntry>> & {
  basis?: string
}

/** True when an existing Soft-Q cell looks hand-filled (preserve on Evaluate). */
export function softScoreLooksHandFilled(entry: SoftScoreEntry | undefined): boolean {
  if (!entry) return false
  // Auto-draft / LLM-assist may be refreshed on re-evaluate.
  if (/auto-draft|think-aloud draft|llm-assist/i.test(entry.rationale ?? '')) return false
  if (entry.value !== null && entry.value !== undefined && entry.value !== '') return true
  return Boolean(entry.rationale?.trim())
}

/**
 * Merge draft Soft-Q under existing evaluation scores.
 * Hand-filled / prior values win; empty keys take the draft.
 */
export function mergeSoftScoreDraft(
  draft: SoftQDraft,
  existing?: SoftQDraft | null,
): SoftQDraft {
  const out: SoftQDraft = { ...draft }
  if (!existing) return out
  for (const [key, entry] of Object.entries(existing)) {
    if (key === 'basis') continue
    if (softScoreLooksHandFilled(entry as SoftScoreEntry)) {
      out[key as SoftScoreKey] = entry as SoftScoreEntry
    }
  }
  out.basis =
    existing.basis && !/think-aloud draft/i.test(existing.basis)
      ? existing.basis
      : draft.basis ?? existing.basis
  return out
}

/**
 * Draft Soft-Q from validEvidence runs (findings / caveats / friction).
 * Returns `{}` (+ basis note) when no valid runs — Evaluate stays empty then.
 */
export function draftSoftScoresFromValidRuns(runs: UxWaveRunItem[]): SoftQDraft {
  const valid = runs.filter((r) => r.validEvidence === true)
  if (!valid.length) {
    return {
      basis: 'No validEvidence runs — Soft-Q draft skipped.',
    }
  }

  const blob = valid.map(narrativeFromRun).join('\n')
  const confusion = hasConfusionSignal(blob)
  const optimistic = anyOptimistic(blob)
  const friction = meanFriction(valid)
  const goalRate =
    valid.filter((r) => r.goalReached === true).length / Math.max(1, valid.length)
  const quote = quoteSnippet(valid)
  const n = valid.length
  const confBase = Math.min(0.75, 0.35 + n * 0.12)

  // Q2/Q3: human gold band ~2 when matrix confusion named
  let q2 = 3
  let q3 = 3
  if (confusion) {
    q2 = 2
    q3 = 2
  } else if (typeof friction === 'number' && friction >= 7) {
    q2 = 2
    q3 = 3
  } else if (optimistic) {
    q2 = 4
    q3 = 4
  }

  // Q1 usefulness: answerable but hard → ~3; abandon without answer → ~2
  let q1 = 3
  if (goalRate < 0.5 && confusion) q1 = 2
  else if (goalRate >= 0.8 && !confusion) q1 = 4
  else if (typeof friction === 'number' && friction >= 8) q1 = 2

  // Q6 return likelihood tracks friction / confusion
  let q6 = 3
  if (confusion || (typeof friction === 'number' && friction >= 8)) q6 = 2
  else if (optimistic && goalRate >= 0.8) q6 = 4

  // Q7 school grade 1–6 (higher = worse in DE schulnote): confusion → 4
  let q7 = 3
  if (confusion || (typeof friction === 'number' && friction >= 8)) q7 = 4
  else if (optimistic && goalRate >= 0.8) q7 = 2

  const draft: SoftQDraft = {
    basis: `Think-Aloud draft from ${n} validEvidence run(s); not Testbirds n=15.`,
    Q1_nuetzlichkeit: soft(
      SCALE_1_5,
      clamp15(q1),
      confBase,
      `Auto-draft: ${quote}`,
    ),
    Q2_bedienbarkeit: soft(
      SCALE_1_5,
      clamp15(q2),
      confusion ? Math.min(0.8, confBase + 0.15) : confBase,
      confusion
        ? `Auto-draft: Bedienung/Matrix-Reibung in Think-Aloud — „${quote}“`
        : `Auto-draft: wenig explizite Bedien-Verwirrung; friction=${friction ?? '—'}.`,
    ),
    Q3_filterlogik: soft(
      SCALE_1_5,
      clamp15(q3),
      confusion ? Math.min(0.85, confBase + 0.2) : confBase,
      confusion
        ? `Auto-draft: Filter/grau/unklar benannt — „${quote}“`
        : `Auto-draft: keine klaren Filter-Cues in Findings.`,
    ),
    Q4_auffindbarkeit: soft(
      SCALE_1_5,
      null,
      0,
      'Auto-draft: Auffindbarkeit (Nav von Home) in diesem Slice nicht belegt.',
    ),
    Q5_produktnah_vs_tool: soft(
      SCALE_CHOICE,
      confusion ? 'produktseite_bevorzugt_vermutet' : null,
      confusion ? 0.4 : 0,
      confusion
        ? 'Auto-draft: Matrix erzeugte Reibung — Produktseite/einfache Antwort vermutlich bevorzugt (H4-Richtung).'
        : 'Auto-draft: kein Kontrast Produktseite vs Tool ableitbar.',
    ),
    Q6_nutzungswahrscheinlichkeit: soft(
      SCALE_1_5,
      clamp15(q6),
      confBase * 0.9,
      `Auto-draft: Wiederkehr bei friction=${friction ?? '—'}, confusion=${confusion}.`,
    ),
    Q7_gesamteindruck: soft(
      SCALE_NOTE,
      q7,
      confBase,
      `Auto-draft: Gesamteindruck (Schulnote) aus validEvidence-Narrativ; n=${n}.`,
    ),
  }

  return draft
}
