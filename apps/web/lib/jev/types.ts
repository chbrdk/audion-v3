/** Jev / OpenRouter Decisions types — specs/domain/jev-decisions.md */

/**
 * OpenRouter Decisions question shape (Jev tutorial / alpha schema):
 * - choice|noul: criteria is a record of option-key → label
 * - score: criteria is an ordered string array (index = score level)
 */
export type JevQuestion =
  | {
      type: 'choice'
      instructions: string
      criteria: Record<string, string>
    }
  | {
      type: 'noul'
      instructions: string
      criteria: { true: string; false: string }
    }
  | {
      type: 'score'
      instructions: string
      criteria: string[]
    }

export type JevQuestions = Record<string, JevQuestion>

export type JevChoiceAnswer = {
  key: string
  probabilities?: Record<string, number>
  confidence?: number
}

export type JevNoulAnswer = {
  probability: number
  confidence?: number
}

export type JevScoreAnswer = {
  score: number
  probabilities?: Record<string, number>
  confidence?: number
}

export type JevDecisionResult = {
  model: string
  choices: Record<string, JevChoiceAnswer>
  nouls: Record<string, JevNoulAnswer>
  scores: Record<string, JevScoreAnswer>
  usage?: { cost?: number; promptTokens?: number }
  latencyMs: number
  raw?: unknown
}

export type JevShadowCompare = {
  useCaseId: string
  baseline: unknown
  jev: unknown | null
  agree: boolean | null
  latencyMs: number | null
  costUsd: number | null
  model: string | null
  error?: string
}

/** Build choice criteria from option keys (label = humanized key). */
export function choiceCriteria(
  options: readonly string[],
  labels?: Partial<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of options) {
    out[key] = labels?.[key] ?? key.replace(/_/g, ' ')
  }
  return out
}

export function choiceQuestion(
  instructions: string,
  options: readonly string[],
  labels?: Partial<Record<string, string>>,
): JevQuestion {
  return {
    type: 'choice',
    instructions,
    criteria: choiceCriteria(options, labels),
  }
}

export function noulQuestion(
  instructions: string,
  whenTrue: string,
  whenFalse: string,
): JevQuestion {
  return {
    type: 'noul',
    instructions,
    criteria: { true: whenTrue, false: whenFalse },
  }
}

export function scoreQuestion(
  instructions: string,
  criteria: string[],
): JevQuestion {
  return { type: 'score', instructions, criteria }
}

/** Default 0..(levels-1) ladder when no custom legend. */
export function scoreLevelCriteria(levels: number): string[] {
  const top = Math.max(1, levels - 1)
  return Array.from({ length: levels }, (_, i) => `Level ${i} of ${top}`)
}
