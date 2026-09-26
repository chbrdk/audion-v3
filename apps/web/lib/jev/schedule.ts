import { scheduleShadowDecision } from '@/lib/jev/shadow'
import type { JevQuestions } from '@/lib/jev/types'

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
  })
}
