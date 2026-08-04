/**
 * Soft-Q draft from validEvidence Think-Aloud / findings.
 * Computes core scales (ease, findability, …), then emits either core keys
 * or the EBM domain-profile aliases (Q1–Q7) depending on the wave shell.
 *
 * @see specs/domain/ux-lab-archetypes.md
 * @see knowledge/lab-l6-soft-q-draft-2026-08-03.md
 */

import type {
  SoftScoreDomainProfileId,
  SoftScoreEntry,
  SoftScoreKey,
  UxWaveRunItem,
} from '@audion-v3/contracts'
import {
  SOFT_SCORE_CORE_KEYS,
  SOFT_SCORE_CORE_TO_EBM,
  SOFT_SCORE_EBM_KEYS,
} from '@audion-v3/contracts'
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

/** Perception-in-the-Loop cues embedded in findings / caveats (agent summary synth). */
function hasPerceptionConfusionCue(text: string): boolean {
  if (!text.trim()) return false
  if (/disabled_option_unexplained|filter_cause_unknown|selection_order_surprise/i.test(text)) {
    return true
  }
  if (/stance\s*[:=]\s*abandon|"stance"\s*:\s*"abandon"/i.test(text)) return true
  if (/clarity\s*[:=]\s*[01]\b|"clarity"\s*:\s*[01]\b/i.test(text)) return true
  if (/wahrgenommen:.*grau|ignoredguess|blind.?spot/i.test(text)) return true
  return false
}

function hasSoftQConfusion(text: string): boolean {
  return hasConfusionSignal(text) || hasPerceptionConfusionCue(text)
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

export type SoftQDraftOptions = {
  /** Prefer pack `domainProfileId`; otherwise inferred from existing softScore keys. */
  domainProfileId?: SoftScoreDomainProfileId | null
  /** Existing wave Soft-Q shell (from ScenarioPack) — drives key shape. */
  existingSoftScores?: SoftQDraft | null
}

/** Infer Soft-Q profile from shell keys (core vs EBM Q*). Default EBM for backward compat. */
export function inferSoftScoreDomainProfile(
  scores: SoftQDraft | null | undefined,
  explicit?: SoftScoreDomainProfileId | null,
): SoftScoreDomainProfileId {
  if (explicit === 'core' || explicit === 'ebm-produktkombinationen') return explicit
  if (!scores) return 'ebm-produktkombinationen'
  const hasCore = SOFT_SCORE_CORE_KEYS.some((k) => k in scores && scores[k])
  const hasEbm = SOFT_SCORE_EBM_KEYS.some((k) => k in scores && scores[k])
  if (hasCore && !hasEbm) return 'core'
  return 'ebm-produktkombinationen'
}

/** True when an existing Soft-Q cell looks hand-filled (preserve on Evaluate). */
export function softScoreLooksHandFilled(entry: SoftScoreEntry | undefined): boolean {
  if (!entry) return false
  if (/auto-draft|think-aloud draft|llm-assist/i.test(entry.rationale ?? '')) return false
  if (entry.value !== null && entry.value !== undefined && entry.value !== '') return true
  return Boolean(entry.rationale?.trim())
}

/**
 * Merge draft Soft-Q under existing evaluation scores.
 * Hand-filled / prior values win; empty / null shell keys take the draft.
 */
export function mergeSoftScoreDraft(
  draft: SoftQDraft,
  existing?: SoftQDraft | null,
): SoftQDraft {
  const out: SoftQDraft = { ...draft }
  if (!existing) return out
  for (const [key, entry] of Object.entries(existing)) {
    if (key === 'basis') continue
    const e = entry as SoftScoreEntry
    if (softScoreLooksHandFilled(e)) {
      out[key as SoftScoreKey] = e
    }
  }
  out.basis =
    existing.basis && !/think-aloud draft|pending agent|soft-q filled after/i.test(existing.basis)
      ? existing.basis
      : draft.basis ?? existing.basis
  return out
}

/** True when Soft-Q still looks like an unevaluated null shell. */
export function softScoresAreEmptyShell(scores: SoftQDraft | null | undefined): boolean {
  if (!scores) return true
  const profile = inferSoftScoreDomainProfile(scores)
  const keys: SoftScoreKey[] =
    profile === 'core'
      ? ['ease', 'clarity', 'likelihood', 'overall', 'usefulness']
      : [
          'Q1_nuetzlichkeit',
          'Q2_bedienbarkeit',
          'Q3_filterlogik',
          'Q6_nutzungswahrscheinlichkeit',
          'Q7_gesamteindruck',
        ]
  return keys.every((k) => {
    const e = scores[k]
    return !e || e.value === null || e.value === undefined || e.value === ''
  })
}

function isFindabilityRun(run: UxWaveRunItem): boolean {
  if (/^Nav-/i.test(run.runKey) || /^Template-findability/i.test(run.runKey)) return true
  return /finde den weg|find (?:your |the )?way|startseite|nicht direkt im tool|without a deeplink|findability/i.test(
    run.task || '',
  )
}

function findabilityLanded(run: UxWaveRunItem): boolean {
  if (run.goalReached === true) return true
  if (/produktkombinationen/i.test(run.finalUrl || '')) return true
  if (/produktkombinationen/i.test(narrativeFromRun(run))) return true
  // Generic: final URL left the start host/path and agent claims success cues
  if (run.finalUrl && run.url && run.finalUrl !== run.url && run.deeplinkCheat === false) {
    try {
      const start = new URL(run.url)
      const end = new URL(run.finalUrl)
      if (start.hostname !== end.hostname) return true
    } catch {
      /* ignore bad URLs */
    }
  }
  return false
}

type CoreDraftValues = {
  ease: number
  clarity: number
  usefulness: number
  findability: number | null
  findabilityConf: number
  findabilityRationale: string
  likelihood: number
  overall: number
  preferenceChoice: string | null
  preferenceConf: number
  preferenceRationale: string
  confBase: number
  quote: string
  friction: number | null
  confusion: boolean
  n: number
}

function computeCoreValues(valid: UxWaveRunItem[]): CoreDraftValues {
  const blob = valid.map(narrativeFromRun).join('\n')
  const confusion = hasSoftQConfusion(blob)
  const optimistic = anyOptimistic(blob)
  const friction = meanFriction(valid)
  const goalRate =
    valid.filter((r) => r.goalReached === true).length / Math.max(1, valid.length)
  const quote = quoteSnippet(valid)
  const n = valid.length
  const confBase = Math.min(0.75, 0.35 + n * 0.12)

  let ease = 3
  let clarity = 3
  if (confusion) {
    ease = 2
    clarity = 2
  } else if (typeof friction === 'number' && friction >= 7) {
    ease = 2
    clarity = 3
  } else if (optimistic) {
    ease = 4
    clarity = 4
  }

  let usefulness = 3
  if (goalRate < 0.5 && confusion) usefulness = 2
  else if (goalRate >= 0.8 && !confusion) usefulness = 4
  else if (typeof friction === 'number' && friction >= 8) usefulness = 2

  let likelihood = 3
  if (confusion || (typeof friction === 'number' && friction >= 8)) likelihood = 2
  else if (optimistic && goalRate >= 0.8) likelihood = 4

  // overall uses DE schulnote 1–6 when mapped to Q7; core overall also 1–6
  let overall = 3
  if (confusion || (typeof friction === 'number' && friction >= 8)) overall = 4
  else if (optimistic && goalRate >= 0.8) overall = 2

  const findRuns = valid.filter(isFindabilityRun)
  const findLanded = findRuns.filter(findabilityLanded)
  let findability: number | null = null
  let findabilityRationale =
    'Auto-draft: Auffindbarkeit / Findability in diesem Slice nicht belegt.'
  let findabilityConf = 0
  if (findRuns.length > 0) {
    const landRate = findLanded.length / findRuns.length
    if (landRate >= 0.8) {
      findability = 4
      findabilityConf = Math.min(0.85, confBase + 0.2)
      findabilityRationale = `Auto-draft: Ziel erreicht (goal/finalUrl); n=${findRuns.length}.`
    } else if (landRate <= 0.2) {
      findability = 2
      findabilityConf = Math.min(0.8, confBase + 0.15)
      findabilityRationale = `Auto-draft: Findability scheiterte / Ziel-URL fehlt; n=${findRuns.length}.`
    } else {
      findability = 3
      findabilityConf = confBase
      findabilityRationale = `Auto-draft: gemischte Findability (${findLanded.length}/${findRuns.length}).`
    }
  }

  return {
    ease: clamp15(ease),
    clarity: clamp15(clarity),
    usefulness: clamp15(usefulness),
    findability,
    findabilityConf,
    findabilityRationale,
    likelihood: clamp15(likelihood),
    overall,
    preferenceChoice: confusion ? 'produktseite_bevorzugt_vermutet' : null,
    preferenceConf: confusion ? 0.4 : 0,
    preferenceRationale: confusion
      ? 'Auto-draft: Matrix/Tool-Reibung — einfachere Antwort vermutlich bevorzugt.'
      : 'Auto-draft: kein Kontrast Produktseite vs Tool ableitbar.',
    confBase,
    quote,
    friction,
    confusion,
    n,
  }
}

function emitCoreDraft(v: CoreDraftValues): SoftQDraft {
  return {
    basis: `Think-Aloud draft (core Soft-Q) from ${v.n} validEvidence run(s); not Testbirds n=15.`,
    ease: soft(
      SCALE_1_5,
      v.ease,
      v.confusion ? Math.min(0.8, v.confBase + 0.15) : v.confBase,
      v.confusion
        ? `Auto-draft: Bedienung/Reibung in Think-Aloud — „${v.quote}“`
        : `Auto-draft: wenig explizite Bedien-Verwirrung; friction=${v.friction ?? '—'}.`,
    ),
    clarity: soft(
      SCALE_1_5,
      v.clarity,
      v.confusion ? Math.min(0.85, v.confBase + 0.2) : v.confBase,
      v.confusion
        ? `Auto-draft: Logik/Filter unklar benannt — „${v.quote}“`
        : `Auto-draft: keine klaren Klarheits-Cues in Findings.`,
    ),
    usefulness: soft(SCALE_1_5, v.usefulness, v.confBase, `Auto-draft: ${v.quote}`),
    findability: soft(SCALE_1_5, v.findability, v.findabilityConf, v.findabilityRationale),
    likelihood: soft(
      SCALE_1_5,
      v.likelihood,
      v.confBase * 0.9,
      `Auto-draft: Wiederkehr bei friction=${v.friction ?? '—'}, confusion=${v.confusion}.`,
    ),
    overall: soft(
      SCALE_NOTE,
      v.overall,
      v.confBase,
      `Auto-draft: Gesamteindruck aus validEvidence-Narrativ; n=${v.n}.`,
    ),
  }
}

function emitEbmDraft(v: CoreDraftValues): SoftQDraft {
  const core = emitCoreDraft(v)
  const draft: SoftQDraft = {
    basis: `Think-Aloud draft from ${v.n} validEvidence run(s); not Testbirds n=15.`,
  }
  for (const coreKey of SOFT_SCORE_CORE_KEYS) {
    const ebmKey = SOFT_SCORE_CORE_TO_EBM[coreKey]
    const cell = core[coreKey]
    if (cell) draft[ebmKey] = cell
  }
  // Q5 is EBM-only choice scale (not in core → EBM map)
  draft.Q5_produktnah_vs_tool = soft(
    SCALE_CHOICE,
    v.preferenceChoice,
    v.preferenceConf,
    v.preferenceRationale,
  )
  return draft
}

/**
 * Draft Soft-Q from validEvidence runs.
 * Profile `core` → ease/findability/… ; default / EBM → Q1–Q7 aliases.
 */
export function draftSoftScoresFromValidRuns(
  runs: UxWaveRunItem[],
  opts?: SoftQDraftOptions,
): SoftQDraft {
  const valid = runs.filter((r) => r.validEvidence === true)
  if (!valid.length) {
    return {
      basis: 'No validEvidence runs — Soft-Q draft skipped.',
    }
  }

  const profile = inferSoftScoreDomainProfile(opts?.existingSoftScores, opts?.domainProfileId)
  const values = computeCoreValues(valid)
  return profile === 'core' ? emitCoreDraft(values) : emitEbmDraft(values)
}

/** Short note for Evaluate notes[] (works for core or EBM keys). */
export function softQDraftNote(draft: SoftQDraft): string {
  if (draft.basis?.includes('skipped')) {
    return 'Soft-Q draft skipped — no validEvidence runs.'
  }
  const ease = draft.ease?.value ?? draft.Q2_bedienbarkeit?.value
  const clarity = draft.clarity?.value ?? draft.Q3_filterlogik?.value
  const findability = draft.findability?.value ?? draft.Q4_auffindbarkeit?.value
  if (ease != null) {
    return `Soft-Q draft applied (ease/Q2=${String(ease)}, clarity/Q3=${String(clarity ?? '—')}, findability/Q4=${String(findability ?? '—')}).`
  }
  return 'Soft-Q draft produced no ease/Q2 (unexpected).'
}
