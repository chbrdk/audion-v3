/**
 * Target group persistence facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 */
import type {
  TargetGroupDetail,
  TargetGroupList,
  TargetGroupWritePayload,
} from '@audion-v3/contracts'
import { isProjectsDatabaseConfigured } from '../db/config'
import { DEMO_TARGET_GROUPS } from './target-groups'
import { storePersonaDetail } from './persona-store'

async function dbApi() {
  return import('../db/target-groups')
}

let groups: TargetGroupDetail[] = DEMO_TARGET_GROUPS.map((g) => structuredClone(g))

export function resetTargetGroupStore(): void {
  groups = DEMO_TARGET_GROUPS.map((g) => structuredClone(g))
}

function withCounts(group: TargetGroupDetail): TargetGroupDetail {
  return {
    ...group,
    personaCount: group.linkedPersonas.length,
    knowledgeEntries: group.knowledgeEntries ?? [],
    documents: group.documents ?? [],
  }
}

async function resolveLinked(
  ids: string[] | undefined,
  fallback: TargetGroupDetail['linkedPersonas'],
) {
  if (!ids) return fallback
  const resolved = await Promise.all(
    ids.map(async (id) => {
      const persona = await storePersonaDetail(id)
      if (!persona) return null
      return {
        id: persona.id,
        name: persona.name,
        role: persona.role,
        status: persona.status,
        avatarUrl: persona.avatarUrl,
      }
    }),
  )
  return resolved.filter((p): p is NonNullable<typeof p> => Boolean(p))
}

function memoryTargetGroupList(): TargetGroupList {
  const items = groups.map((g) => {
    const detail = withCounts(g)
    const { linkedPersonas: _lp, ...summary } = detail
    return summary
  })
  return { items, total: items.length, page: 1, pageSize: 50 }
}

function memoryTargetGroupDetail(id: string): TargetGroupDetail | null {
  const found = groups.find((g) => g.id === id)
  return found ? withCounts(found) : null
}

function memoryTargetGroupForPersona(personaId: string): TargetGroupDetail | null {
  const found = groups.find((g) => g.linkedPersonas.some((p) => p.id === personaId))
  return found ? withCounts(found) : null
}

async function memoryCreateTargetGroup(payload: TargetGroupWritePayload): Promise<TargetGroupDetail> {
  const id = `tg-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const linkedPersonas = await resolveLinked(payload.linkedPersonaIds, [])
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
    knowledgeEntries: payload.knowledgeEntries ?? [],
    documents: payload.documents ?? [],
  })
  groups = [created, ...groups]
  return created
}

async function memoryPatchTargetGroup(
  id: string,
  payload: Partial<TargetGroupWritePayload>,
): Promise<TargetGroupDetail | null> {
  const index = groups.findIndex((g) => g.id === id)
  if (index < 0) return null
  const current = groups[index]!
  const linkedPersonas = await resolveLinked(payload.linkedPersonaIds, current.linkedPersonas)
  const next = withCounts({
    ...current,
    name: payload.name?.trim() ?? current.name,
    segment: payload.segment?.trim() ?? current.segment,
    description: payload.description !== undefined ? payload.description : current.description,
    status: payload.status ?? current.status,
    projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
    linkedPersonas,
    knowledgeEntries:
      payload.knowledgeEntries !== undefined
        ? payload.knowledgeEntries
        : current.knowledgeEntries ?? [],
    documents: payload.documents !== undefined ? payload.documents : current.documents ?? [],
    updatedAt: new Date().toISOString(),
  })
  groups = [...groups.slice(0, index), next, ...groups.slice(index + 1)]
  return next
}

export async function storeTargetGroupList(): Promise<TargetGroupList> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbTargetGroupList()
  }
  return memoryTargetGroupList()
}

export async function storeTargetGroupDetail(id: string): Promise<TargetGroupDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbTargetGroupDetail(id)
  }
  return memoryTargetGroupDetail(id)
}

export async function storeTargetGroupForPersona(
  personaId: string,
): Promise<TargetGroupDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbTargetGroupForPersona(personaId)
  }
  return memoryTargetGroupForPersona(personaId)
}

export async function storeCreateTargetGroup(
  payload: TargetGroupWritePayload,
): Promise<TargetGroupDetail> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCreateTargetGroup(payload)
  }
  return memoryCreateTargetGroup(payload)
}

export async function storePatchTargetGroup(
  id: string,
  payload: Partial<TargetGroupWritePayload>,
): Promise<TargetGroupDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchTargetGroup(id, payload)
  }
  return memoryPatchTargetGroup(id, payload)
}
