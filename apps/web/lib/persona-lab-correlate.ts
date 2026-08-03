/**
 * Persona Lab correlator — score a single B-run against the human-oriented gold band.
 * Pure / fixture-friendly: no network. Use after Sync (or with synthetic snapshots in tests).
 *
 * @see knowledge/persona-iteration-lab-2026-08-03.md
 */

import type { UxWaveRunItem } from '@audion-v3/contracts'
import { paths } from './paths'

/** Confusion / abandon cues (DE + EN) that human EBM narratives use for H1/H2. */
export const PERSONA_LAB_CONFUSION_RES: RegExp[] = [
  /matrix/i,
  /\bgrau(e|en)?\b/i,
  /ausgeblendet/i,
  /disabled|greyed|grayed/i,
  /unklar/i,
  /überforder/i,
  /(?<!keine\s)(?<!kein\s)(?<!ohne\s)verwirr/i,
  /nicht selbsterklär/i,
  /wei[sß]s? nicht warum/i,
  /abbruch|aufgegeb|aufgeben|abgebrochen/i,
  /kein klarer nächster/i,
  /filterlogik|filter.?ursache/i,
  /ohne erklärung/i,
]

/** Too-competent / optimistic cues that widen the human gap. */
export const PERSONA_LAB_OPTIMISTIC_RES: RegExp[] = [
  /mühelos|kinderspiel|sehr einfach gefunden/i,
  /keine reibung|zero friction/i,
  /alles klar/i,
  /keine verwirrung/i,
]

function blobHas(res: RegExp[], text: string): boolean {
  return res.some((re) => re.test(text))
}

/** True when narrative reports real confusion — ignores negated “keine Verwirrung”. */
export function hasConfusionSignal(text: string): boolean {
  if (!text.trim()) return false
  if (/\bkeine\s+verwirrung\b/i.test(text) && !/\bmatrix\b|\bausgeblendet\b|\bfilterlogik\b/i.test(text)) {
    return false
  }
  return blobHas(PERSONA_LAB_CONFUSION_RES, text)
}

export type PersonaLabGoldBand = {
  packId: string
  runKey: string
  maxStepsCap: number
  /** Inclusive friction band for “closer to human”. */
  frictionMin: number
  frictionMax: number
  /** Persona fit should stay modest when confused (not “perfect user”). */
  personaFitMax: number
  /** When policy is present, impatient lab persona must show pressure. */
  timePressureMin: number
  /** Minimum fraction of weighted checks to call the run “closer”. */
  closerScoreThreshold: number
}

export const PERSONA_LAB_GOLD: PersonaLabGoldBand = {
  packId: paths.personaLabPackId,
  runKey: 'B-aufgabe1-nachruesten',
  maxStepsCap: 15,
  frictionMin: 7,
  frictionMax: 10,
  personaFitMax: 4,
  timePressureMin: 0.75,
  closerScoreThreshold: 0.65,
}

export type PersonaLabRunSnapshot = {
  runKey: string
  steps: number | null
  maxSteps: number | null
  frictionScore: number | null
  personaFitScore: number | null
  goalReached: boolean | null
  taskCompleted: boolean | null
  finding: string | null
  /** Summary + think-aloud / step reasoning blob. */
  narrativeBlob: string
  /** From agent personaPolicy.dimensions when available. */
  timePressure: number | null
  blockers: string[]
}

export type PersonaLabCheckId =
  | 'run_key'
  | 'infra_clean'
  | 'step_budget'
  | 'friction_band'
  | 'confusion_named'
  | 'not_optimistic'
  | 'fit_not_inflated'
  | 'time_pressure_wired'

export type PersonaLabCheck = {
  id: PersonaLabCheckId
  label: string
  pass: boolean
  weight: number
  detail: string
}

export type PersonaLabCorrelateResult = {
  closer: boolean
  score: number
  checks: PersonaLabCheck[]
  verdict: string
  gold: PersonaLabGoldBand
}

export function waveRunToPersonaLabSnapshot(
  run: UxWaveRunItem,
  extras?: {
    narrativeBlob?: string | null
    timePressure?: number | null
  },
): PersonaLabRunSnapshot {
  const finding = run.finding ?? ''
  const narrative =
    (extras?.narrativeBlob ?? '').trim() ||
    [finding, run.validEvidenceCaveat ?? ''].filter(Boolean).join('\n')
  return {
    runKey: run.runKey,
    steps: run.steps,
    maxSteps: run.maxSteps,
    frictionScore: run.frictionScore,
    personaFitScore: run.personaFitScore,
    goalReached: run.goalReached,
    taskCompleted: run.taskCompleted,
    finding,
    narrativeBlob: narrative,
    timePressure:
      typeof extras?.timePressure === 'number' && Number.isFinite(extras.timePressure)
        ? extras.timePressure
        : null,
    blockers: [...(run.blockers ?? [])],
  }
}

/** Gold-adjacent snapshot from baseline wave B (human-oriented narrative). */
export function baselineBGoldSnapshot(): PersonaLabRunSnapshot {
  return {
    runKey: 'B-aufgabe1-nachruesten',
    steps: 12,
    maxSteps: 15,
    frictionScore: 9,
    personaFitScore: 2,
    goalReached: true,
    taskCompleted: true,
    finding: 'Aufgabe 1 erfüllbar; Matrix-Filter für Nutzer nicht selbsterklärend.',
    narrativeBlob:
      'Optionen wurden ausgeblendet ohne klare Erklärung. Filterlogik unklar — echter Nutzer hätte eher abgebrochen.',
    timePressure: 0.9,
    blockers: [],
  }
}

/** Control: competent/patient agent that under-reports confusion. */
export function optimisticAgentSnapshot(): PersonaLabRunSnapshot {
  return {
    runKey: 'B-aufgabe1-nachruesten',
    steps: 40,
    maxSteps: 40,
    frictionScore: 2,
    personaFitScore: 8,
    goalReached: true,
    taskCompleted: true,
    finding: 'Displays gefunden; alles klar, keine Verwirrung.',
    narrativeBlob: 'Mühelos über Site-Search zur Antwort. Sehr einfach gefunden.',
    timePressure: 0.5,
    blockers: [],
  }
}

export function correlatePersonaLabRun(
  snap: PersonaLabRunSnapshot,
  gold: PersonaLabGoldBand = PERSONA_LAB_GOLD,
): PersonaLabCorrelateResult {
  const text = `${snap.finding ?? ''}\n${snap.narrativeBlob}`.trim()
  const hardInfra = snap.blockers.some(
    (b) => b === 'cloudfront_403' || b === 'archive_org_workaround',
  )
  const stepCap = Math.min(gold.maxStepsCap, snap.maxSteps ?? gold.maxStepsCap)
  const stepsOk =
    typeof snap.steps === 'number' && snap.steps > 0 && snap.steps <= stepCap
  const friction = snap.frictionScore
  const frictionOk =
    typeof friction === 'number' &&
    friction >= gold.frictionMin &&
    friction <= gold.frictionMax
  const confusionOk = hasConfusionSignal(text)
  const optimisticHit = blobHas(PERSONA_LAB_OPTIMISTIC_RES, text)
  const optimisticCombo =
    snap.goalReached === true &&
    typeof friction === 'number' &&
    friction <= 4 &&
    !confusionOk
  const notOptimistic = !optimisticHit && !optimisticCombo
  const fit = snap.personaFitScore
  const fitOk = fit == null || (typeof fit === 'number' && fit <= gold.personaFitMax)
  const tp = snap.timePressure
  const timePressureOk =
    tp == null ? true : typeof tp === 'number' && tp >= gold.timePressureMin

  const checks: PersonaLabCheck[] = [
    {
      id: 'run_key',
      label: 'Lab run key is B-aufgabe1',
      pass: snap.runKey === gold.runKey,
      weight: 1,
      detail: `got ${snap.runKey}`,
    },
    {
      id: 'infra_clean',
      label: 'No hard infra blockers',
      pass: !hardInfra,
      weight: 2,
      detail: hardInfra ? snap.blockers.join(',') : 'ok',
    },
    {
      id: 'step_budget',
      label: `Steps within impatient budget (≤${stepCap})`,
      pass: stepsOk,
      weight: 2,
      detail: `steps=${snap.steps} maxSteps=${snap.maxSteps}`,
    },
    {
      id: 'friction_band',
      label: `Friction in human band (${gold.frictionMin}–${gold.frictionMax})`,
      pass: frictionOk,
      weight: 3,
      detail: `friction=${friction}`,
    },
    {
      id: 'confusion_named',
      label: 'Confusion / matrix / abandon named',
      pass: confusionOk,
      weight: 3,
      detail: confusionOk ? 'signal found' : 'no confusion cues',
    },
    {
      id: 'not_optimistic',
      label: 'Not optimistic clean-success',
      pass: notOptimistic,
      weight: 3,
      detail: optimisticCombo
        ? 'goal+low friction without confusion'
        : optimisticHit
          ? 'optimistic wording'
          : 'ok',
    },
    {
      id: 'fit_not_inflated',
      label: `Persona fit ≤ ${gold.personaFitMax} when scored`,
      pass: fitOk,
      weight: 1,
      detail: `fit=${fit}`,
    },
    {
      id: 'time_pressure_wired',
      label: `time_pressure ≥ ${gold.timePressureMin} when reported`,
      pass: timePressureOk,
      weight: 2,
      detail: tp == null ? 'not reported (skipped)' : `time_pressure=${tp}`,
    },
  ]

  const totalW = checks.reduce((s, c) => s + c.weight, 0)
  const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0)
  const score = totalW > 0 ? Math.round((earned / totalW) * 100) / 100 : 0
  const closer = score >= gold.closerScoreThreshold && !hardInfra

  const failed = checks.filter((c) => !c.pass).map((c) => c.id)
  const verdict = closer
    ? `Closer to human band (score ${score}).`
    : `Not closer yet (score ${score}; failed: ${failed.join(', ') || 'none'}).`

  return { closer, score, checks, verdict, gold }
}
