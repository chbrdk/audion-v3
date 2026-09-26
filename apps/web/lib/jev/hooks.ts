/**
 * Shadow helpers for Audion fuzzy baselines.
 * Spec: specs/domain/jev-decisions.md — fail-open, fire-and-forget, no Act.
 */
import {
  JEV_USE_CASES,
  questionsFrictionSeverity,
  questionsInsightTriage,
} from '@/lib/jev/catalog'
import { scheduleJevShadow } from '@/lib/jev/schedule'

export type FrictionSeverity = 'high' | 'medium' | 'low'
export type InsightTriage = 'act_now' | 'watch' | 'noise'

export function heuristicInsightTriage(
  severity: string | undefined | null,
): InsightTriage {
  if (severity === 'high') return 'act_now'
  if (severity === 'low') return 'noise'
  return 'watch'
}

/** Shadow `audion.friction_severity` after heuristic severity is known. */
export function shadowFrictionSeverity(opts: {
  description: string
  phase: string
  severity: FrictionSeverity
}): void {
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.audionFrictionSeverity,
    state: {
      description: opts.description,
      phase: opts.phase,
      baseline: opts.severity,
    },
    questions: questionsFrictionSeverity(),
    baseline: opts.severity,
    extractChoiceKey: 'severity',
  })
}

/** Shadow `audion.insight_triage` for a UX finding — does not change product SoT. */
export function shadowInsightTriage(opts: {
  title?: string
  detail?: string
  severity?: string
}): void {
  const triage = heuristicInsightTriage(opts.severity)
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.audionInsightTriage,
    state: {
      title: opts.title ?? null,
      detail: opts.detail ?? null,
      severity: opts.severity ?? 'medium',
      baseline: triage,
    },
    questions: questionsInsightTriage(),
    baseline: triage,
    extractChoiceKey: 'triage',
  })
}
