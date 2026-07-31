import { desc, eq, sql } from 'drizzle-orm'
import type {
  TargetGroupDetail,
  TargetGroupList,
  TargetGroupLinkedPersona,
  TargetGroupStatus,
  TargetGroupWritePayload,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { dbPersonaSummariesByIds } from './personas'
import { targetGroups, type TargetGroupRow } from './schema'

function normalizeStatus(value: string | null | undefined): TargetGroupStatus {
  if (value === 'archived' || value === 'draft' || value === 'active') return value
  return 'draft'
}

function rowToDetail(row: TargetGroupRow): TargetGroupDetail {
  const linkedPersonas = Array.isArray(row.linkedPersonas) ? row.linkedPersonas : []
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    description: row.description ?? null,
    status: normalizeStatus(row.status),
    personaCount: row.personaCount ?? linkedPersonas.length,
    projectId: row.projectId ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    linkedPersonas,
    knowledgeEntries: row.knowledgeEntries ?? [],
    documents: row.documents ?? [],
  }
}

function toSummary(detail: TargetGroupDetail) {
  const { linkedPersonas: _lp, ...summary } = detail
  return summary
}

async function resolveLinked(
  ids: string[] | undefined,
  fallback: TargetGroupLinkedPersona[],
): Promise<TargetGroupLinkedPersona[]> {
  if (!ids) return fallback
  return dbPersonaSummariesByIds(ids)
}

export async function dbTargetGroupList(): Promise<TargetGroupList> {
  const db = getDb()
  const rows = await db.select().from(targetGroups).orderBy(desc(targetGroups.updatedAt))
  const items = rows.map((row) => toSummary(rowToDetail(row)))
  return { items, total: items.length, page: 1, pageSize: Math.max(50, items.length) }
}

export async function dbTargetGroupDetail(id: string): Promise<TargetGroupDetail | null> {
  const db = getDb()
  const rows = await db.select().from(targetGroups).where(eq(targetGroups.id, id)).limit(1)
  const row = rows[0]
  return row ? rowToDetail(row) : null
}

export async function dbTargetGroupForPersona(personaId: string): Promise<TargetGroupDetail | null> {
  const db = getDb()
  const rows = await db.select().from(targetGroups)
  const found = rows.find((row) => {
    const ids = Array.isArray(row.linkedPersonaIds) ? row.linkedPersonaIds : []
    const linked = Array.isArray(row.linkedPersonas) ? row.linkedPersonas : []
    return ids.includes(personaId) || linked.some((p) => p.id === personaId)
  })
  return found ? rowToDetail(found) : null
}

export async function dbCountTargetGroupsByProjectId(projectId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(targetGroups)
    .where(eq(targetGroups.projectId, projectId))
  return Number(rows[0]?.n ?? 0)
}

export async function dbCreateTargetGroup(
  payload: TargetGroupWritePayload,
): Promise<TargetGroupDetail> {
  const id = `tg-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const linkedPersonas = await resolveLinked(payload.linkedPersonaIds, [])
  const linkedPersonaIds = linkedPersonas.map((p) => p.id)
  const now = new Date()
  const detail: TargetGroupDetail = {
    id,
    name: payload.name.trim(),
    segment: payload.segment.trim() || 'Segment',
    description: payload.description ?? null,
    status: payload.status ?? 'draft',
    personaCount: linkedPersonas.length,
    projectId: payload.projectId ?? null,
    updatedAt: now.toISOString(),
    linkedPersonas,
    knowledgeEntries: payload.knowledgeEntries ?? [],
    documents: payload.documents ?? [],
  }
  const db = getDb()
  await db.insert(targetGroups).values({
    id,
    name: detail.name,
    segment: detail.segment,
    description: detail.description,
    status: detail.status,
    projectId: detail.projectId,
    linkedPersonaIds,
    linkedPersonas,
    personaCount: linkedPersonas.length,
    knowledgeEntries: detail.knowledgeEntries,
    documents: detail.documents,
    updatedAt: now,
    createdAt: now,
  })
  return detail
}

export async function dbPatchTargetGroup(
  id: string,
  payload: Partial<TargetGroupWritePayload>,
): Promise<TargetGroupDetail | null> {
  const current = await dbTargetGroupDetail(id)
  if (!current) return null
  const linkedPersonas = await resolveLinked(
    payload.linkedPersonaIds,
    current.linkedPersonas,
  )
  const linkedPersonaIds = linkedPersonas.map((p) => p.id)
  const next: TargetGroupDetail = {
    ...current,
    name: payload.name?.trim() ?? current.name,
    segment: payload.segment?.trim() ?? current.segment,
    description: payload.description !== undefined ? payload.description : current.description,
    status: payload.status ?? current.status,
    projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
    linkedPersonas,
    personaCount: linkedPersonas.length,
    knowledgeEntries:
      payload.knowledgeEntries !== undefined
        ? payload.knowledgeEntries
        : current.knowledgeEntries ?? [],
    documents: payload.documents !== undefined ? payload.documents : current.documents ?? [],
    updatedAt: new Date().toISOString(),
  }
  const db = getDb()
  await db
    .update(targetGroups)
    .set({
      name: next.name,
      segment: next.segment,
      description: next.description,
      status: next.status,
      projectId: next.projectId,
      linkedPersonaIds,
      linkedPersonas,
      personaCount: linkedPersonas.length,
      knowledgeEntries: next.knowledgeEntries,
      documents: next.documents,
      updatedAt: new Date(),
    })
    .where(eq(targetGroups.id, id))
  return next
}
