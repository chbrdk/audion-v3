import { desc, eq, sql } from 'drizzle-orm'
import type {
  TargetGroupDetail,
  TargetGroupList,
  TargetGroupLinkedPersona,
  TargetGroupStatus,
  TargetGroupWritePayload,
} from '@audion-v3/contracts'
import { allocateUniqueSlug, ensureEntitySlug, slugifyName } from '../entity-slug'
import { getDb } from './client'
import { ensureEntitySlugSchema } from './ensure-entity-slug-schema'
import { dbPersonaSummariesByIds } from './personas'
import { targetGroups, type TargetGroupRow } from './schema'

function normalizeStatus(value: string | null | undefined): TargetGroupStatus {
  if (value === 'archived' || value === 'draft' || value === 'active') return value
  return 'draft'
}

function rowToDetail(row: TargetGroupRow): TargetGroupDetail {
  const linkedPersonas = Array.isArray(row.linkedPersonas) ? row.linkedPersonas : []
  return ensureEntitySlug({
    id: row.id,
    slug: row.slug ?? null,
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
  })
}

function toSummary(detail: TargetGroupDetail) {
  const { linkedPersonas: _lp, knowledgeEntries: _ke, documents: _docs, ...summary } = detail
  return summary
}

async function resolveLinked(
  ids: string[] | undefined,
  fallback: TargetGroupLinkedPersona[],
): Promise<TargetGroupLinkedPersona[]> {
  if (!ids) return fallback
  return dbPersonaSummariesByIds(ids)
}

async function takenTgSlugs(excludeId?: string): Promise<string[]> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db.select({ id: targetGroups.id, slug: targetGroups.slug }).from(targetGroups)
  return rows
    .filter((r) => !(excludeId && r.id === excludeId))
    .map((r) => r.slug?.trim() || '')
    .filter(Boolean)
}

export async function dbTargetGroupList(): Promise<TargetGroupList> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db.select().from(targetGroups).orderBy(desc(targetGroups.updatedAt))
  const items = rows.map((row) => toSummary(rowToDetail(row)))
  return { items, total: items.length, page: 1, pageSize: Math.max(50, items.length) }
}

export async function dbTargetGroupDetail(ref: string): Promise<TargetGroupDetail | null> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const byId = await db.select().from(targetGroups).where(eq(targetGroups.id, ref)).limit(1)
  if (byId[0]) return rowToDetail(byId[0])
  const bySlug = await db.select().from(targetGroups).where(eq(targetGroups.slug, ref)).limit(1)
  return bySlug[0] ? rowToDetail(bySlug[0]) : null
}

export async function dbTargetGroupForPersona(personaId: string): Promise<TargetGroupDetail | null> {
  await ensureEntitySlugSchema()
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
  await ensureEntitySlugSchema()
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
  await ensureEntitySlugSchema()
  const id = `tg-${slugifyName(payload.name)}-${Date.now().toString(36)}`
  const projectId = payload.projectId ?? null
  const slug = allocateUniqueSlug(payload.name, await takenTgSlugs())
  const linkedPersonas = await resolveLinked(payload.linkedPersonaIds, [])
  const linkedPersonaIds = linkedPersonas.map((p) => p.id)
  const now = new Date()
  const detail: TargetGroupDetail = ensureEntitySlug({
    id,
    slug,
    name: payload.name.trim(),
    segment: payload.segment.trim() || 'Segment',
    description: payload.description ?? null,
    status: payload.status ?? 'draft',
    personaCount: linkedPersonas.length,
    projectId,
    updatedAt: now.toISOString(),
    linkedPersonas,
    knowledgeEntries: payload.knowledgeEntries ?? [],
    documents: payload.documents ?? [],
  })
  const db = getDb()
  await db.insert(targetGroups).values({
    id,
    slug: detail.slug,
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
  ref: string,
  payload: Partial<TargetGroupWritePayload>,
): Promise<TargetGroupDetail | null> {
  await ensureEntitySlugSchema()
  const current = await dbTargetGroupDetail(ref)
  if (!current) return null
  const linkedPersonas = await resolveLinked(
    payload.linkedPersonaIds,
    current.linkedPersonas,
  )
  const linkedPersonaIds = linkedPersonas.map((p) => p.id)
  const nextName = payload.name?.trim() ?? current.name
  const nameChanged = Boolean(payload.name?.trim() && payload.name.trim() !== current.name)
  const nextProjectId =
    payload.projectId !== undefined ? payload.projectId : current.projectId
  const slug =
    nameChanged || !current.slug?.trim()
      ? allocateUniqueSlug(nextName, await takenTgSlugs(current.id), current.slug)
      : current.slug
  const next: TargetGroupDetail = ensureEntitySlug({
    ...current,
    slug,
    name: nextName,
    segment: payload.segment?.trim() ?? current.segment,
    description: payload.description !== undefined ? payload.description : current.description,
    status: payload.status ?? current.status,
    projectId: nextProjectId,
    linkedPersonas,
    personaCount: linkedPersonas.length,
    knowledgeEntries:
      payload.knowledgeEntries !== undefined
        ? payload.knowledgeEntries
        : current.knowledgeEntries ?? [],
    documents: payload.documents !== undefined ? payload.documents : current.documents ?? [],
    updatedAt: new Date().toISOString(),
  })
  const db = getDb()
  await db
    .update(targetGroups)
    .set({
      slug: next.slug,
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
    .where(eq(targetGroups.id, current.id))
  return next
}

export async function dbDeleteTargetGroup(id: string): Promise<boolean> {
  await ensureEntitySlugSchema()
  const resolved = await dbTargetGroupDetail(id)
  const canonicalId = resolved?.id ?? id
  const db = getDb()
  const deleted = await db
    .delete(targetGroups)
    .where(eq(targetGroups.id, canonicalId))
    .returning({ id: targetGroups.id })
  return deleted.length > 0
}

/** Idempotent demo seed — fixed id (unlike dbCreateTargetGroup). */
export async function dbInsertTargetGroupDetail(detail: TargetGroupDetail): Promise<TargetGroupDetail> {
  await ensureEntitySlugSchema()
  const withSlug = ensureEntitySlug(detail)
  const linkedPersonaIds = withSlug.linkedPersonas.map((p) => p.id)
  const now = new Date()
  const db = getDb()
  await db.insert(targetGroups).values({
    id: withSlug.id,
    slug: withSlug.slug,
    name: withSlug.name,
    segment: withSlug.segment,
    description: withSlug.description,
    status: withSlug.status,
    projectId: withSlug.projectId,
    linkedPersonaIds,
    linkedPersonas: withSlug.linkedPersonas,
    personaCount: withSlug.personaCount,
    knowledgeEntries: withSlug.knowledgeEntries ?? [],
    documents: withSlug.documents ?? [],
    updatedAt: now,
    createdAt: now,
  })
  return { ...withSlug, updatedAt: now.toISOString() }
}

/** Drop a persona id from every target group that lists it. */
export async function dbUnlinkPersonaFromAllTargetGroups(personaId: string): Promise<void> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db.select().from(targetGroups)
  for (const row of rows) {
    const ids = Array.isArray(row.linkedPersonaIds) ? row.linkedPersonaIds : []
    if (!ids.includes(personaId)) continue
    const nextIds = ids.filter((id) => id !== personaId)
    const linkedPersonas = await dbPersonaSummariesByIds(nextIds)
    await db
      .update(targetGroups)
      .set({
        linkedPersonaIds: nextIds,
        linkedPersonas,
        personaCount: linkedPersonas.length,
        updatedAt: new Date(),
      })
      .where(eq(targetGroups.id, row.id))
  }
}
