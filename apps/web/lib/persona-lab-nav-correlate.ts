/**
 * Persona Lab Nav correlator — H3: final URL/title must match Produktkombinationen tool.
 * Pure / fixture-friendly. Use after Sync or with synthetic snapshots.
 *
 * @see knowledge/persona-lab-micro-labs-2026-08-04.md
 */

import type { UxWaveRunItem } from '@audion-v3/contracts'
import { paths } from './paths'

const TOOL_URL_RE = /produktkombinationen/i
const TOOL_TITLE_RES: RegExp[] = [
  /produktkombinationen/i,
  /product\s*combinati/i,
  /kompatibilit/i,
]

export type PersonaLabNavGold = {
  packId: string
  runKey: string
  maxStepsCap: number
  closerScoreThreshold: number
}

export const PERSONA_LAB_NAV_GOLD: PersonaLabNavGold = {
  packId: paths.personaLabNavPackId,
  runKey: 'Nav-home-to-tool',
  maxStepsCap: 12,
  closerScoreThreshold: 0.65,
}

export type PersonaLabNavSnapshot = {
  runKey: string
  steps: number | null
  maxSteps: number | null
  /** Final page URL from agent job / run extras. */
  finalUrl: string | null
  /** Final document title when available. */
  finalTitle: string | null
  finding: string | null
  narrativeBlob: string
  goalReached: boolean | null
  blockers: string[]
}

export type PersonaLabNavCheckId =
  | 'run_key'
  | 'infra_clean'
  | 'usable_run'
  | 'step_budget'
  | 'url_matches_tool'
  | 'title_or_narrative_tool'
  | 'started_not_on_tool'

export type PersonaLabNavCheck = {
  id: PersonaLabNavCheckId
  label: string
  pass: boolean
  weight: number
  detail: string
}

export type PersonaLabNavCorrelateResult = {
  closer: boolean
  score: number
  checks: PersonaLabNavCheck[]
  verdict: string
  gold: PersonaLabNavGold
}

export function toolUrlMatches(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  return TOOL_URL_RE.test(url)
}

export function toolTitleMatches(title: string | null | undefined): boolean {
  if (!title?.trim()) return false
  return TOOL_TITLE_RES.some((re) => re.test(title))
}

export function waveRunToPersonaLabNavSnapshot(
  run: UxWaveRunItem,
  extras?: {
    finalUrl?: string | null
    finalTitle?: string | null
    narrativeBlob?: string
  },
): PersonaLabNavSnapshot {
  return {
    runKey: run.runKey,
    steps: run.steps,
    maxSteps: run.maxSteps,
    finalUrl: extras?.finalUrl ?? null,
    finalTitle: extras?.finalTitle ?? null,
    finding: run.finding,
    narrativeBlob:
      extras?.narrativeBlob ??
      [run.finding, run.validEvidenceCaveat, run.task].filter(Boolean).join('\n'),
    goalReached: run.goalReached,
    blockers: run.blockers ?? [],
  }
}

export function correlatePersonaLabNavRun(
  snap: PersonaLabNavSnapshot,
  gold: PersonaLabNavGold = PERSONA_LAB_NAV_GOLD,
): PersonaLabNavCorrelateResult {
  const blob = `${snap.narrativeBlob}\n${snap.finding ?? ''}`
  const infraClean = !(snap.blockers || []).some((b) =>
    /cloudfront|403|infra/i.test(b),
  )
  const usable =
    (snap.steps ?? 0) > 0 &&
    !/agent error|cancelled|empty summary/i.test(snap.finding ?? '')
  const urlOk = toolUrlMatches(snap.finalUrl)
  const titleOk =
    toolTitleMatches(snap.finalTitle) || TOOL_URL_RE.test(blob) || TOOL_TITLE_RES.some((re) => re.test(blob))
  const startedOffTool = !toolUrlMatches(paths.boschEbikeHomeUrl) // home is never tool
  const withinBudget =
    snap.steps == null ||
    (snap.steps <= (snap.maxSteps ?? gold.maxStepsCap) && snap.steps <= gold.maxStepsCap)

  const checks: PersonaLabNavCheck[] = [
    {
      id: 'run_key',
      label: 'Nav run key',
      pass: snap.runKey === gold.runKey,
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
      id: 'url_matches_tool',
      label: 'Final URL is Produktkombinationen',
      pass: urlOk,
      weight: 3,
      detail: snap.finalUrl ?? '(missing)',
    },
    {
      id: 'title_or_narrative_tool',
      label: 'Title or narrative names tool page',
      pass: titleOk,
      weight: 2,
      detail: snap.finalTitle ?? clip(blob, 80),
    },
    {
      id: 'started_not_on_tool',
      label: 'Pack starts on home (not tool)',
      pass: startedOffTool,
      weight: 1,
      detail: paths.boschEbikeHomeUrl,
    },
  ]

  const weightSum = checks.reduce((s, c) => s + c.weight, 0)
  const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0)
  const score = weightSum > 0 ? earned / weightSum : 0
  const closer = score >= gold.closerScoreThreshold && urlOk && infraClean && usable

  return {
    closer,
    score,
    checks,
    verdict: closer
      ? 'closer — landed on tool (H3 URL proof)'
      : 'gap — missing tool URL/title or unusable run',
    gold,
  }
}

function clip(text: string, n: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`
}

/** Synthetic pass fixture for unit tests. */
export function navGoldSnapshot(): PersonaLabNavSnapshot {
  return {
    runKey: PERSONA_LAB_NAV_GOLD.runKey,
    steps: 6,
    maxSteps: 12,
    finalUrl: paths.boschEbikeProduktkombinationenUrl,
    finalTitle: 'Produktkombinationen | Bosch eBike Systems',
    finding: 'Tool über Service gefunden',
    narrativeBlob: 'Von Home über Service zu Produktkombinationen navigiert.',
    goalReached: true,
    blockers: [],
  }
}

/** Synthetic fail: stuck on home. */
export function navMissedToolSnapshot(): PersonaLabNavSnapshot {
  return {
    runKey: PERSONA_LAB_NAV_GOLD.runKey,
    steps: 8,
    maxSteps: 12,
    finalUrl: paths.boschEbikeHomeUrl,
    finalTitle: 'Bosch eBike Systems',
    finding: 'Nicht gefunden',
    narrativeBlob: 'Auf der Startseite geblieben, Tool nicht gefunden.',
    goalReached: false,
    blockers: [],
  }
}
