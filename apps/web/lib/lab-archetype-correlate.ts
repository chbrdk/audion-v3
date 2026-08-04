/**
 * Domain-agnostic lab archetype correlators.
 * Findability success comes from pack/run `successCriteria`, not brand strings.
 *
 * @see specs/domain/ux-lab-archetypes.md
 */

import type { UxSuccessCriteria, UxWaveRunItem } from '@audion-v3/contracts'

export type FindabilitySnapshot = {
  runKey: string
  steps: number | null
  maxSteps: number | null
  finalUrl: string | null
  finalTitle: string | null
  finding: string | null
  narrativeBlob: string
  goalReached: boolean | null
  blockers: string[]
  deeplinkCheat: boolean | null
  startUrl: string | null
}

export type FindabilityGold = {
  runKey?: string
  maxStepsCap: number
  closerScoreThreshold: number
  /** Prefer pack successCriteria; pattern defaults applied when kind is url_match. */
  successCriteria: UxSuccessCriteria
  /** Start URL must not already satisfy success (findability honesty). */
  requireStartedOffTarget?: boolean
}

export type FindabilityCheckId =
  | 'run_key'
  | 'infra_clean'
  | 'usable_run'
  | 'step_budget'
  | 'url_matches'
  | 'title_or_narrative'
  | 'started_off_target'
  | 'no_deeplink_cheat'

export type FindabilityCheck = {
  id: FindabilityCheckId
  label: string
  pass: boolean
  weight: number
  detail: string
}

export type FindabilityCorrelateResult = {
  closer: boolean
  score: number
  checks: FindabilityCheck[]
  verdict: string
  gold: FindabilityGold
}

function compilePattern(pattern: string | null | undefined): RegExp | null {
  const raw = (pattern || '').trim()
  if (!raw) return null
  try {
    return new RegExp(raw, 'i')
  } catch {
    return null
  }
}

export function matchesSuccessPattern(
  criteria: UxSuccessCriteria | null | undefined,
  input: { url?: string | null; title?: string | null; blob?: string | null },
): boolean {
  if (!criteria) return false
  const re = compilePattern(criteria.pattern)
  if (criteria.kind === 'url_match') {
    if (!re || !input.url?.trim()) return false
    return re.test(input.url)
  }
  if (criteria.kind === 'title_match') {
    if (!re || !input.title?.trim()) return false
    return re.test(input.title)
  }
  if (criteria.kind === 'goal_text') {
    if (!re || !input.blob?.trim()) return false
    return re.test(input.blob)
  }
  if (criteria.kind === 'honest_abandon') {
    return /abbruch|abandon|breche ab/i.test(input.blob || '')
  }
  return false
}

export function waveRunToFindabilitySnapshot(
  run: UxWaveRunItem,
  extras?: {
    finalUrl?: string | null
    finalTitle?: string | null
    narrativeBlob?: string
    startUrl?: string | null
  },
): FindabilitySnapshot {
  return {
    runKey: run.runKey,
    steps: run.steps,
    maxSteps: run.maxSteps,
    finalUrl: extras?.finalUrl ?? run.finalUrl ?? null,
    finalTitle: extras?.finalTitle ?? run.finalTitle ?? null,
    finding: run.finding,
    narrativeBlob:
      extras?.narrativeBlob ??
      [run.finding, run.validEvidenceCaveat, run.task].filter(Boolean).join('\n'),
    goalReached: run.goalReached,
    blockers: run.blockers ?? [],
    deeplinkCheat: run.deeplinkCheat ?? null,
    startUrl: extras?.startUrl ?? run.url ?? null,
  }
}

function clip(text: string, n: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`
}

/**
 * Correlate a findability / path-finding run against pack successCriteria.
 */
export function correlateFindabilityRun(
  snap: FindabilitySnapshot,
  gold: FindabilityGold,
): FindabilityCorrelateResult {
  const blob = `${snap.narrativeBlob}\n${snap.finding ?? ''}`
  const infraClean = !(snap.blockers || []).some((b) => /cloudfront|403|infra/i.test(b))
  const usable =
    (snap.steps ?? 0) > 0 && !/agent error|cancelled|empty summary/i.test(snap.finding ?? '')
  const urlOk = matchesSuccessPattern(gold.successCriteria, { url: snap.finalUrl })
  const titleOk =
    matchesSuccessPattern(
      { kind: 'title_match', pattern: gold.successCriteria.pattern },
      { title: snap.finalTitle },
    ) ||
    matchesSuccessPattern(
      { kind: 'goal_text', pattern: gold.successCriteria.pattern },
      { blob },
    )
  const startedOff =
    gold.requireStartedOffTarget === false
      ? true
      : !matchesSuccessPattern(gold.successCriteria, { url: snap.startUrl })
  const withinBudget =
    snap.steps == null ||
    (snap.steps <= (snap.maxSteps ?? gold.maxStepsCap) && snap.steps <= gold.maxStepsCap)
  const noCheat = snap.deeplinkCheat !== true

  const checks: FindabilityCheck[] = [
    {
      id: 'run_key',
      label: 'Run key',
      pass: !gold.runKey || snap.runKey === gold.runKey,
      weight: 1,
      detail: snap.runKey,
    },
    {
      id: 'infra_clean',
      label: 'No infra blocker',
      pass: infraClean,
      weight: 2,
      detail: (snap.blockers || []).join(',') || 'ok',
    },
    {
      id: 'usable_run',
      label: 'Usable agent run',
      pass: usable,
      weight: 2,
      detail: `steps=${snap.steps} finding=${snap.finding ?? ''}`,
    },
    {
      id: 'step_budget',
      label: 'Within step budget',
      pass: withinBudget,
      weight: 1,
      detail: `steps=${snap.steps} cap=${gold.maxStepsCap}`,
    },
    {
      id: 'url_matches',
      label: 'Final URL matches successCriteria',
      pass: urlOk,
      weight: 3,
      detail: snap.finalUrl ?? '(missing)',
    },
    {
      id: 'title_or_narrative',
      label: 'Title or narrative matches pattern',
      pass: titleOk,
      weight: 2,
      detail: snap.finalTitle ?? clip(blob, 80),
    },
    {
      id: 'started_off_target',
      label: 'Started off target URL',
      pass: startedOff,
      weight: 1,
      detail: snap.startUrl ?? '(missing)',
    },
    {
      id: 'no_deeplink_cheat',
      label: 'No navigate deeplink cheat',
      pass: noCheat,
      weight: 2,
      detail:
        snap.deeplinkCheat === true
          ? 'cheat'
          : snap.deeplinkCheat === false
            ? 'honest'
            : 'unknown',
    },
  ]

  const weightSum = checks.reduce((s, c) => s + c.weight, 0)
  const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0)
  const score = weightSum > 0 ? earned / weightSum : 0
  const closer = score >= gold.closerScoreThreshold && urlOk && infraClean && usable && noCheat

  return {
    closer,
    score,
    checks,
    verdict: closer
      ? 'closer — destination reached via UI path'
      : 'gap — missing destination URL/title or unusable run',
    gold,
  }
}
