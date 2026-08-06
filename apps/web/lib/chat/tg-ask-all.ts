/**
 * Target-group ask-all helpers — specs/domain/chat-workspace.md Phase TG.
 */

import type {
  ChatTargetGroupRound,
  ChatTargetGroupRoundSlot,
  TargetGroupLinkedPersona,
} from '@audion-v3/contracts'

/** Hard cap (parity with AUDION-v2 admin chat). */
export const MAX_TG_CHAT_PERSONAS = 10

export function selectTgChatPersonas(
  linked: TargetGroupLinkedPersona[] | null | undefined,
): TargetGroupLinkedPersona[] {
  return (linked ?? []).slice(0, MAX_TG_CHAT_PERSONAS)
}

export function buildTgRoundSlots(
  linked: TargetGroupLinkedPersona[] | null | undefined,
): ChatTargetGroupRoundSlot[] {
  return selectTgChatPersonas(linked).map((p) => ({
    personaId: p.id,
    personaName: p.name,
    role: p.role,
    content: '',
    status: 'pending',
    error: null,
  }))
}

export function createTgRound(input: {
  question: string
  linked: TargetGroupLinkedPersona[] | null | undefined
}): ChatTargetGroupRound {
  return {
    id: `tg-round-${Date.now()}`,
    question: input.question.trim(),
    createdAt: new Date().toISOString(),
    slots: buildTgRoundSlots(input.linked),
  }
}

export function buildChatTargetGroupHref(targetGroupId: string): string {
  const qs = new URLSearchParams({ targetGroupId: targetGroupId.trim() })
  return `/chat?${qs.toString()}`
}
