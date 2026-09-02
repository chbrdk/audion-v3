/**
 * Ask-all helpers — TG linked personas + project personas.
 * Specs: domain/chat-workspace.md Phase TG · Phase Project.
 */

import type {
  ChatTargetGroupRound,
  ChatTargetGroupRoundSlot,
  PersonaSummary,
  TargetGroupLinkedPersona,
} from '@audion-v3/contracts'

/** Hard cap (parity with AUDION-v2 admin chat). Shared by TG + project ask-all. */
export const MAX_TG_CHAT_PERSONAS = 10
export const MAX_ASK_ALL_CHAT_PERSONAS = MAX_TG_CHAT_PERSONAS

export type AskAllPersonaRef = {
  id: string
  name: string
  role: string
}

export function selectTgChatPersonas(
  linked: TargetGroupLinkedPersona[] | null | undefined,
): TargetGroupLinkedPersona[] {
  return (linked ?? []).slice(0, MAX_TG_CHAT_PERSONAS)
}

export function selectProjectChatPersonas(
  personas: PersonaSummary[] | null | undefined,
  projectId: string | null | undefined,
): PersonaSummary[] {
  const id = projectId?.trim()
  if (!id) return []
  return (personas ?? [])
    .filter((p) => p.projectId === id)
    .slice(0, MAX_ASK_ALL_CHAT_PERSONAS)
}

export function countProjectChatPersonas(
  personas: PersonaSummary[] | null | undefined,
  projectId: string | null | undefined,
): number {
  const id = projectId?.trim()
  if (!id) return 0
  return (personas ?? []).filter((p) => p.projectId === id).length
}

export function buildAskAllRoundSlots(
  personas: AskAllPersonaRef[] | null | undefined,
): ChatTargetGroupRoundSlot[] {
  return (personas ?? []).slice(0, MAX_ASK_ALL_CHAT_PERSONAS).map((p) => ({
    personaId: p.id,
    personaName: p.name,
    role: p.role,
    content: '',
    status: 'pending',
    error: null,
  }))
}

export function buildTgRoundSlots(
  linked: TargetGroupLinkedPersona[] | null | undefined,
): ChatTargetGroupRoundSlot[] {
  return buildAskAllRoundSlots(selectTgChatPersonas(linked))
}

export function createAskAllRound(input: {
  question: string
  personas: AskAllPersonaRef[] | null | undefined
  idPrefix?: string
}): ChatTargetGroupRound {
  return {
    id: `${input.idPrefix ?? 'ask-all-round'}-${Date.now()}`,
    question: input.question.trim(),
    createdAt: new Date().toISOString(),
    slots: buildAskAllRoundSlots(input.personas),
  }
}

export function createTgRound(input: {
  question: string
  linked: TargetGroupLinkedPersona[] | null | undefined
}): ChatTargetGroupRound {
  return createAskAllRound({
    question: input.question,
    personas: selectTgChatPersonas(input.linked),
    idPrefix: 'tg-round',
  })
}

export function createProjectRound(input: {
  question: string
  personas: PersonaSummary[] | null | undefined
  projectId: string | null | undefined
}): ChatTargetGroupRound {
  return createAskAllRound({
    question: input.question,
    personas: selectProjectChatPersonas(input.personas, input.projectId),
    idPrefix: 'project-round',
  })
}

export function buildChatTargetGroupHref(targetGroupId: string): string {
  const qs = new URLSearchParams({ targetGroupId: targetGroupId.trim() })
  return `/chat?${qs.toString()}`
}

/** Project ask-all deep-link — projectId alone (no personaId; share uses both). */
export function buildChatProjectHref(projectId: string): string {
  const qs = new URLSearchParams({ projectId: projectId.trim() })
  return `/chat?${qs.toString()}`
}
