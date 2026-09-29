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
/**
 * Parallel `/api/chat/stream` fan-out limit.
 * Blind Promise.all(N≤10) saturates OpenRouter/OpenAI and often yields empty
 * completions (Writing flash → blank slots). Spec: chat-workspace ask-all transport.
 */
export const ASK_ALL_STREAM_CONCURRENCY = 3

/** Run async work over `items` with at most `limit` in flight. */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  const concurrency = Math.max(1, Math.min(limit, items.length || 1))
  let next = 0
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index]!, index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

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
