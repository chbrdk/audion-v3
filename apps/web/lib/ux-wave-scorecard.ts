/**
 * Map UX Journey Agent scorecard + infrastructure signals onto UxWaveRunItem fields.
 * Evidence gate: reject cancelled / empty / crash junk; agentSuccess alone is not enough
 * (CloudFront 403 / archive-only). Honest abandon with Think-Aloud can still be valid.
 */

import type { UxWaveRunItem } from '@audion-v3/contracts'
import type { UxJourneyAgentJobStatus, UxJourneyAgentStep } from './ux-journey-agent-client'

export type AgentScorecard = {
  frictionScore?: number | null
  personaFitScore?: number | null
  coverage?: { goalReached?: boolean | null } | null
  perCategoryLLM?: Record<string, number | { score?: number } | null> | null
  confusion?: { tagCount?: number | null } | null
}

const INFRA_BLOCKER_PATTERNS: Array<{ re: RegExp; blocker: string }> = [
  { re: /\b403\b|cloudfront|access.?denied|request.?blocked/i, blocker: 'cloudfront_403' },
  { re: /web\.archive\.org|wayback|archive\.org/i, blocker: 'archive_org_workaround' },
]

const CRASH_OR_EMPTY_RES: RegExp[] = [
  /^agent error$/i,
  /could not parse response/i,
  /credit_balance_exhausted|no credits remaining/i,
  /run was cancelled before completion/i,
]

const GENERIC_FINDING_RES: RegExp[] = [
  /^browser agent completed run\.?$/i,
  /^agent error$/i,
  /^run was cancelled/i,
]

function flattenCategories(
  perCategory: AgentScorecard['perCategoryLLM'],
): Record<string, number> {
  if (!perCategory || typeof perCategory !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(perCategory)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw
      continue
    }
    if (raw && typeof raw === 'object' && typeof raw.score === 'number') {
      out[key] = raw.score
    }
  }
  return out
}

function collectTextBlob(input: {
  summary?: string | null
  error?: string | null
  steps?: UxJourneyAgentStep[]
}): string {
  const parts: string[] = []
  if (input.summary) parts.push(input.summary)
  if (input.error) parts.push(input.error)
  for (const step of input.steps ?? []) {
    if (step.result) parts.push(String(step.result))
    if (step.reasoning) parts.push(String(step.reasoning))
    if (step.target) parts.push(String(step.target))
    if (step.action) parts.push(String(step.action))
  }
  return parts.join('\n')
}

/** Detect infrastructure blockers from agent output text. */
export function inferInfrastructureBlockers(blob: string): string[] {
  const found = new Set<string>()
  for (const { re, blocker } of INFRA_BLOCKER_PATTERNS) {
    if (re.test(blob)) found.add(blocker)
  }
  return [...found]
}

function thinkAloudHasSubstance(thinkAloud: Record<string, unknown> | null | undefined): boolean {
  if (!thinkAloud || typeof thinkAloud !== 'object') return false
  for (const value of Object.values(thinkAloud)) {
    if (typeof value === 'string' && value.trim().length >= 20) return true
    if (value && typeof value === 'object') {
      const label = (value as { label?: unknown }).label
      if (typeof label === 'string' && label.trim().length > 0) return true
    }
  }
  return false
}

/** True when the run has persona-facing UX substance (Think-Aloud / done / notes). */
export function hasUsableUxSubstance(input: {
  summary?: string | null
  steps?: UxJourneyAgentStep[]
  confusionTagCount?: number | null
}): boolean {
  const summary = (input.summary || '').trim()
  if (summary.length >= 40 && !GENERIC_FINDING_RES.some((re) => re.test(summary))) {
    return true
  }
  if (typeof input.confusionTagCount === 'number' && input.confusionTagCount > 0) {
    return true
  }
  for (const step of input.steps ?? []) {
    if (thinkAloudHasSubstance(step.thinkAloud ?? null)) return true
    if (
      String(step.action || '').toLowerCase() === 'done' &&
      String(step.result || '').trim().length >= 40
    ) {
      return true
    }
    if (String(step.reasoning || '').trim().length >= 60) return true
    if (Array.isArray(step.observations) && step.observations.length > 0) return true
  }
  return false
}

/**
 * Lab L5 junk gate — cancelled / empty / crash runs must not become validEvidence.
 */
export function isJunkEvidenceRun(input: {
  cancelled?: boolean
  summary?: string | null
  error?: string | null
  steps?: UxJourneyAgentStep[]
  agentSuccess?: boolean
  taskCompleted?: boolean
}): { junk: boolean; reason: string | null } {
  if (input.cancelled) {
    return { junk: true, reason: 'cancelled — not valid evidence' }
  }
  // Only treat as empty when the caller explicitly provided steps (finished job).
  if (Array.isArray(input.steps) && input.steps.length === 0) {
    return { junk: true, reason: 'empty run — no steps' }
  }
  const steps = input.steps ?? []
  const blob = `${input.summary || ''}\n${input.error || ''}`.trim()
  if (CRASH_OR_EMPTY_RES.some((re) => re.test(blob)) && !hasUsableUxSubstance(input)) {
    return { junk: true, reason: 'empty/crash run — not valid evidence' }
  }
  if (steps.length > 0) {
    const usableSteps = steps.filter((s) => String(s.action || '').toLowerCase() !== 'error')
    if (usableSteps.length === 0) {
      return { junk: true, reason: 'empty/crash run — only error steps' }
    }
  }
  // Short/generic payloads without substance: junk only when the run also failed.
  if (
    !hasUsableUxSubstance(input) &&
    !input.agentSuccess &&
    !input.taskCompleted &&
    blob.length < 40
  ) {
    return { junk: true, reason: 'empty summary — not valid evidence' }
  }
  return { junk: false, reason: null }
}

/**
 * Decide validEvidence for a completed agent run.
 * - Cancelled / empty / crash junk → invalid (Lab L5)
 * - Hard infra (403 / archive) without successful task → invalid
 * - Task completed despite intermittent 403 → valid + caveat
 * - Honest abandon with Think-Aloud / confusion tags → valid even if goal unmet
 * - Agent success alone is insufficient
 */
export function inferValidEvidence(input: {
  agentSuccess: boolean
  taskCompleted: boolean
  blockers: string[]
  cancelled?: boolean
  summary?: string | null
  error?: string | null
  steps?: UxJourneyAgentStep[]
  confusionTagCount?: number | null
}): { validEvidence: boolean; validEvidenceCaveat: string | null } {
  const junk = isJunkEvidenceRun({
    cancelled: input.cancelled,
    summary: input.summary,
    error: input.error,
    steps: input.steps,
    agentSuccess: input.agentSuccess,
    taskCompleted: input.taskCompleted,
  })
  if (junk.junk) {
    return { validEvidence: false, validEvidenceCaveat: junk.reason }
  }

  const hard403 = input.blockers.includes('cloudfront_403')
  const archive = input.blockers.includes('archive_org_workaround')
  const intermittent = input.blockers.includes('cloudfront_403_intermittent')

  if (input.taskCompleted && (intermittent || hard403 || archive)) {
    return {
      validEvidence: true,
      validEvidenceCaveat:
        '403/Archive-Umweg; echter Nutzer hätte eher abgebrochen',
    }
  }

  if (hard403 || archive) {
    return { validEvidence: false, validEvidenceCaveat: null }
  }

  const substance = hasUsableUxSubstance({
    summary: input.summary,
    steps: input.steps,
    confusionTagCount: input.confusionTagCount,
  })

  // Honest incomplete / abandoned journeys still count when UX substance exists.
  if (
    substance &&
    (input.agentSuccess || input.taskCompleted || String(input.summary || '').length >= 40)
  ) {
    return { validEvidence: true, validEvidenceCaveat: null }
  }

  if (!input.taskCompleted) {
    return { validEvidence: false, validEvidenceCaveat: null }
  }

  return {
    validEvidence: input.agentSuccess || input.taskCompleted,
    validEvidenceCaveat: null,
  }
}

export function mapAgentResultToWaveRun(
  run: UxWaveRunItem,
  status: UxJourneyAgentJobStatus,
): UxWaveRunItem {
  const steps = status.result?.steps ?? []
  const cancelled = Boolean(status.result?.cancelled)
  const agentSuccess =
    Boolean(status.result?.success) && status.status === 'complete' && !cancelled
  const sc = (status.result?.scorecard ?? null) as AgentScorecard | null
  const blob = collectTextBlob({
    summary: status.result?.summary,
    error: status.error ?? status.result?.error,
    steps,
  })
  let blockers = inferInfrastructureBlockers(blob)

  const coverageGoal =
    typeof sc?.coverage?.goalReached === 'boolean' ? sc.coverage.goalReached : null
  const hardInfra =
    blockers.includes('cloudfront_403') || blockers.includes('archive_org_workaround')

  // Prefer scorecard coverage; never treat hard infra as task complete via agentSuccess alone
  const goalReached = coverageGoal === true
  const taskCompleted =
    coverageGoal === true ||
    (coverageGoal === null && agentSuccess && !hardInfra && !cancelled)

  // Intermittent: task completed but 403 still present in trail
  if (taskCompleted && blockers.includes('cloudfront_403')) {
    blockers = blockers
      .filter((b) => b !== 'cloudfront_403')
      .concat('cloudfront_403_intermittent')
  }

  const confusionTagCount =
    typeof sc?.confusion?.tagCount === 'number' ? sc.confusion.tagCount : null

  const evidence = inferValidEvidence({
    agentSuccess,
    taskCompleted,
    blockers,
    cancelled,
    summary: status.result?.summary,
    error: status.error ?? status.result?.error,
    steps,
    confusionTagCount,
  })

  const categories = flattenCategories(sc?.perCategoryLLM)
  const friction =
    typeof sc?.frictionScore === 'number'
      ? sc.frictionScore
      : run.frictionScore ?? (agentSuccess ? 7 : 11)
  const fit =
    typeof sc?.personaFitScore === 'number'
      ? sc.personaFitScore
      : run.personaFitScore ?? null

  const finding =
    status.result?.summary ||
    run.finding ||
    (cancelled
      ? 'Run was cancelled before completion.'
      : agentSuccess
        ? 'Browser agent completed run.'
        : status.error || status.result?.error || 'Agent error')

  return {
    ...run,
    agentStatus: 'complete',
    agentSuccess,
    taskCompleted,
    validEvidence: evidence.validEvidence,
    validEvidenceCaveat: evidence.validEvidenceCaveat ?? run.validEvidenceCaveat,
    blockers: blockers.length ? blockers : run.blockers ?? [],
    steps: steps.length || run.steps,
    goalReached,
    frictionScore: friction,
    personaFitScore: fit,
    categories: Object.keys(categories).length ? categories : run.categories ?? {},
    finding,
  }
}
