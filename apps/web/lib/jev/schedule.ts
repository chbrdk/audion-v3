import { isJevActEnabled } from '@/lib/jev/env'
import { runShadowDecision, scheduleShadowDecision } from '@/lib/jev/shadow'
import type { JevDecisionResult, JevQuestions, JevShadowCompare } from '@/lib/jev/types'
import { reportLlmUsage, reportVendorCostUsd } from '@/lib/usage-report'

export type JevScheduleOpts = {
  useCaseId: string
  state: unknown
  questions: JevQuestions
  baseline: unknown
  extractChoiceKey?: string
  extractNoulKey?: string
  extractNoulThreshold?: number
  fetchImpl?: typeof fetch
  /** Optional billing user; falls back to ALS usage context. */
  userId?: string | null
}

function extractJevFromResult(opts: JevScheduleOpts, r: JevDecisionResult): unknown {
  if (opts.extractChoiceKey) {
    return r.choices[opts.extractChoiceKey]?.key ?? null
  }
  if (opts.extractNoulKey) {
    const p = r.nouls[opts.extractNoulKey]?.probability
    if (typeof p !== 'number') return null
    return p >= (opts.extractNoulThreshold ?? 0.5)
  }
  return null
}

function attachUsageReporting(opts: JevScheduleOpts) {
  return (
    compare: JevShadowCompare,
    result: Awaited<ReturnType<typeof import('@/lib/jev/client').createJevDecisions>> | null,
  ) => {
    const promptTokens = result?.usage?.promptTokens
    if (typeof promptTokens === 'number' && promptTokens > 0) {
      reportLlmUsage({
        userId: opts.userId,
        usage: {
          input_tokens: Math.floor(promptTokens),
          output_tokens: 0,
          model: result?.model,
        },
        surface: `jev.${opts.useCaseId}`,
      })
    } else if (typeof compare.costUsd === 'number' && compare.costUsd >= 0) {
      reportVendorCostUsd({
        userId: opts.userId,
        costUsd: compare.costUsd,
        surface: `jev.${opts.useCaseId}`,
        model: compare.model ?? undefined,
      })
    }
  }
}

/** Fire-and-forget Jev shadow for a fuzzy baseline decision. */
export function scheduleJevShadow(opts: JevScheduleOpts): void {
  scheduleShadowDecision({
    useCaseId: opts.useCaseId,
    state: opts.state,
    questions: opts.questions,
    baseline: opts.baseline,
    fetchImpl: opts.fetchImpl,
    extractJev: (r) => extractJevFromResult(opts, r),
    onResult: attachUsageReporting(opts),
  })
}

/**
 * When Act is on: await Jev and return compare (SoT path).
 * When only shadow: fire-and-forget, return null.
 */
export async function resolveJevActOrShadow(
  opts: JevScheduleOpts,
): Promise<JevShadowCompare | null> {
  if (isJevActEnabled(opts.useCaseId)) {
    return runShadowDecision({
      useCaseId: opts.useCaseId,
      state: opts.state,
      questions: opts.questions,
      baseline: opts.baseline,
      extractJev: (r) => extractJevFromResult(opts, r),
      awaitResult: true,
      fetchImpl: opts.fetchImpl,
      onResult: attachUsageReporting(opts),
    })
  }
  scheduleJevShadow(opts)
  return null
}
