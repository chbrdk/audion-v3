/** Persona chat eval types — specs/domain/persona-chat-eval.md */

export type ChatEvalLocale = 'de' | 'en'

export type ChatEvalMode =
  | 'greeting'
  | 'opinion'
  | 'frustration'
  | 'geo'
  | 'product'
  | 'employer'
  | 'price'
  | 'compare'
  | 'followup'

export type ChatEvalForbid =
  | 'emoji'
  | 'interview'
  | 'category'
  | 'coach'

export type ChatEvalExpectations = {
  maxWords: number
  /** Max numbered list items (GEO). */
  maxNumbered?: number
  forbid?: ChatEvalForbid[]
  requireLocaleMatch?: boolean
}

export type ChatEvalCase = {
  id: string
  locale: ChatEvalLocale
  mode: ChatEvalMode
  prompt: string
  expectations: ChatEvalExpectations
}

export type ChatEvalCheckId =
  | 'maxWords'
  | 'noEmoji'
  | 'noInterviewCloser'
  | 'noCategoryLabels'
  | 'noCoachOffer'
  | 'maxNumbered'
  | 'localeMatch'

export type ChatEvalCheckResult = {
  id: ChatEvalCheckId
  passed: boolean
  detail: string
}

export type ChatEvalCaseResult = {
  caseId: string
  locale: ChatEvalLocale
  mode: ChatEvalMode
  passed: boolean
  wordCount: number
  checks: ChatEvalCheckResult[]
  replyPreview: string
}
