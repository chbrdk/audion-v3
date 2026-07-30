import type {
  TargetGroupDetail,
  TargetGroupList,
  TargetGroupWritePayload,
} from '@audion-v3/contracts'
import { DEMO_TARGET_GROUPS } from './target-groups'
import { storePersonaDetail } from './persona-store'

let groups: TargetGroupDetail[] = DEMO_TARGET_GROUPS.map((g) => structuredClone(g))

export function resetTargetGroupStore(): void {
  groups = DEMO_TARGET_GROUPS.map((g) => structuredClone(g))
}

function withCounts(group: TargetGroupDetail): TargetGroupDetail {
  return { ...group, personaCount: group.linkedPersonas.length }
}

export function storeTargetGroupList(): TargetGroupList {
  const items = groups.map((g) => {
    const detail = withCounts(g)
    const { linkedPersonas: _lp, ...summary } = detail
    return summary
  })
  return { items, total: items.length, page: 1, pageSize: 50 }
}

export function storeTargetGroupDetail(id: string): TargetGroupDetail | null {
  const found = groups.find((g) => g.id === id)
  return found ? withCounts(found) : null
}

/** First target group that lists this persona (magazine context title). */
export function storeTargetGroupForPersona(personaId: string): TargetGroupDetail | null {
  const found = groups.find((g) => g.linkedPersonas.some((p) => p.id === personaId))
  return found ? withCounts(found) : null
}

function resolveLinked(ids: string[] | undefined, fallback: TargetGroupDetail['linkedPersonas']) {
  if (!ids) return fallback
  return ids
    .map((id) => {
      const persona = storePersonaDetail(id)
      if (!persona) return null
      return {
        id: persona.id,
        name: persona.name,
        role: persona.role,
        status: persona.status,
        avatarUrl: persona.avatarUrl,
      }
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
}

export function storeCreateTargetGroup(payload: TargetGroupWritePayload): TargetGroupDetail {
  const id = `tg-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const linkedPersonas = resolveLinked(payload.linkedPersonaIds, [])
  const created: TargetGroupDetail = withCounts({
    id,
    name: payload.name.trim(),
    segment: payload.segment.trim() || 'Segment',
    description: payload.description ?? null,
    status: payload.status ?? 'draft',
    personaCount: linkedPersonas.length,
    projectId: payload.projectId ?? null,
    updatedAt: new Date().toISOString(),
    linkedPersonas,
  })
  groups = [created, ...groups]
  return created
}

export function storePatchTargetGroup(
  id: string,
  payload: Partial<TargetGroupWritePayload>,
): TargetGroupDetail | null {
  const index = groups.findIndex((g) => g.id === id)
  if (index < 0) return null
  const current = groups[index]!
  const linkedPersonas = resolveLinked(payload.linkedPersonaIds, current.linkedPersonas)
  const next = withCounts({
    ...current,
    name: payload.name?.trim() ?? current.name,
    segment: payload.segment?.trim() ?? current.segment,
    description: payload.description !== undefined ? payload.description : current.description,
    status: payload.status ?? current.status,
    projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
    linkedPersonas,
    updatedAt: new Date().toISOString(),
  })
  groups = [...groups.slice(0, index), next, ...groups.slice(index + 1)]
  return next
}
