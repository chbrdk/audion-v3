import { scheduleShadowDecision } from '@/lib/jev/shadow'
import type { JevQuestions } from '@/lib/jev/types'
import { reportLlmUsage, reportVendorCostUsd } from '@/lib/usage-report'

/** Fire-and-forget Jev shadow for a fuzzy baseline decision. */
export function scheduleJevShadow(opts: {
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
}): void {
  scheduleShadowDecision({
    useCaseId: opts.useCaseId,
    state: opts.state,
    questions: opts.questions,
    baseline: opts.baseline,
    fetchImpl: opts.fetchImpl,
    extractJev: (r) => {
      if (opts.extractChoiceKey) {
        return r.choices[opts.extractChoiceKey]?.key ?? null
      }
      if (opts.extractNoulKey) {
        const p = r.nouls[opts.extractNoulKey]?.probability
        if (typeof p !== 'number') return null
        return p >= (opts.extractNoulThreshold ?? 0.5)
      }
      return null
    },
    onResult: (compare, result) => {
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
    },
  })
}
