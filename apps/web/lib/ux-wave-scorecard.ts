/**
 * Map UX Journey Agent scorecard + infrastructure signals onto UxWaveRunItem fields.
 * Evidence gate: agentSuccess alone is not validEvidence (CloudFront 403 / archive-only).
 */

import type { UxWaveRunItem } from '@audion-v3/contracts'
import type { UxJourneyAgentJobStatus, UxJourneyAgentStep } from './ux-journey-agent-client'

export type AgentScorecard = {
  frictionScore?: number | null
  personaFitScore?: number | null
  coverage?: { goalReached?: boolean | null } | null
  perCategoryLLM?: Record<string, number | { score?: number } | null> | null
}

const INFRA_BLOCKER_PATTERNS: Array<{ re: RegExp; blocker: string }> = [
  { re: /\b403\b|cloudfront|access.?denied|request.?blocked/i, blocker: 'cloudfront_403' },
  { re: /web\.archive\.org|wayback|archive\.org/i, blocker: 'archive_org_workaround' },
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

/**
 * Decide validEvidence for a completed agent run.
 * - Hard infra (403 / archive) without successful task → invalid
 * - Task completed despite intermittent 403 → valid + caveat
 * - Agent success alone is insufficient (matches EBM July-30 semantics)
 */
export function inferValidEvidence(input: {
  agentSuccess: boolean
  taskCompleted: boolean
  blockers: string[]
}): { validEvidence: boolean; validEvidenceCaveat: string | null } {
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
  const agentSuccess = Boolean(status.result?.success) && status.status === 'complete'
  const sc = (status.result?.scorecard ?? null) as AgentScorecard | null
  const blob = collectTextBlob({
    summary: status.result?.summary,
    error: status.error,
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
    coverageGoal === true || (coverageGoal === null && agentSuccess && !hardInfra)

  // Intermittent: task completed but 403 still present in trail
  if (taskCompleted && blockers.includes('cloudfront_403')) {
    blockers = blockers
      .filter((b) => b !== 'cloudfront_403')
      .concat('cloudfront_403_intermittent')
  }

  const evidence = inferValidEvidence({
    agentSuccess,
    taskCompleted,
    blockers,
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
    finding:
      status.result?.summary ||
      run.finding ||
      (agentSuccess ? 'Browser agent completed run.' : status.error || 'Agent error'),
  }
}
