import { createJevDecisions } from '@/lib/jev/client'
import { isJevActEnabled, isJevShadowEnabled } from '@/lib/jev/env'
import type { JevQuestions, JevShadowCompare } from '@/lib/jev/types'

export type ShadowDecisionInput = {
  useCaseId: string
  state: unknown
  questions: JevQuestions
  baseline: unknown
  /** Extract comparable Jev value from decisions result */
  extractJev: (result: Awaited<ReturnType<typeof createJevDecisions>>) => unknown
  agree?: (baseline: unknown, jev: unknown) => boolean
  /** When true, await the call (tests). Default: fire-and-forget. */
  awaitResult?: boolean
  log?: (compare: JevShadowCompare) => void
  fetchImpl?: typeof fetch
}

const defaultLog = (compare: JevShadowCompare) => {
  try {
    // Structured one-liner for Coolify / platform logs
    console.info('[jev-shadow]', JSON.stringify(compare))
  } catch {
    /* ignore */
  }
}

function defaultAgree(baseline: unknown, jev: unknown): boolean {
  return JSON.stringify(baseline) === JSON.stringify(jev)
}

/**
 * Shadow (or Act-extract) Jev decision. Fail-open. Does not change baseline.
 * Spec: specs/domain/jev-decisions.md
 */
export async function runShadowDecision(
  input: ShadowDecisionInput,
): Promise<JevShadowCompare | null> {
  const shadow = isJevShadowEnabled(input.useCaseId)
  const act = isJevActEnabled(input.useCaseId)
  if (!shadow && !act) return null

  const log = input.log ?? defaultLog

  const run = async (): Promise<JevShadowCompare> => {
    try {
      const result = await createJevDecisions({
        state: input.state,
        questions: input.questions,
        fetchImpl: input.fetchImpl,
      })
      const jev = input.extractJev(result)
      const agreeFn = input.agree ?? defaultAgree
      const compare: JevShadowCompare = {
        useCaseId: input.useCaseId,
        baseline: input.baseline,
        jev,
        agree: agreeFn(input.baseline, jev),
        latencyMs: result.latencyMs,
        costUsd: result.usage?.cost ?? null,
        model: result.model,
      }
      log(compare)
      return compare
    } catch (err) {
      const compare: JevShadowCompare = {
        useCaseId: input.useCaseId,
        baseline: input.baseline,
        jev: null,
        agree: null,
        latencyMs: null,
        costUsd: null,
        model: null,
        error: err instanceof Error ? err.message : 'unknown',
      }
      log(compare)
      return compare
    }
  }

  if (input.awaitResult) {
    return run()
  }

  void run()
  return null
}

/** Convenience: schedule shadow without awaiting (request path). */
export function scheduleShadowDecision(input: Omit<ShadowDecisionInput, 'awaitResult'>): void {
  void runShadowDecision({ ...input, awaitResult: false })
}
