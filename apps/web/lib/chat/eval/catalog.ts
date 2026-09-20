/**
 * Baseline bilingual persona-chat eval catalog (5 modes × 2 locales).
 * Append cases in catalog.json to scale — do not hardcode mode logic in scorers.
 * Spec: specs/domain/persona-chat-eval.md
 */

import type { ChatEvalCase } from './types'
import catalogJson from './catalog.json'

export const PERSONA_CHAT_EVAL_CATALOG: ChatEvalCase[] =
  catalogJson as ChatEvalCase[]

export function listPersonaChatEvalCases(): ChatEvalCase[] {
  return PERSONA_CHAT_EVAL_CATALOG
}

export function getPersonaChatEvalCase(id: string): ChatEvalCase | undefined {
  return PERSONA_CHAT_EVAL_CATALOG.find((c) => c.id === id)
}
