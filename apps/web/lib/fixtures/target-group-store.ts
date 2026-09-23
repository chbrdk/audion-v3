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
import { allocateUniqueSlug, ensureEntitySlug, slugifyName } from '../entity-slug'
import { isProjectsDatabaseConfigured } from '../db/config'
import { DEMO_TARGET_GROUPS } from './target-groups'
import { storePersonaDetail } from './persona-store'

async function dbApi() {
  return import('../db/target-groups')
}

/** Empty until create or `resetTargetGroupStore()` (tests). No DEMO product seed. */
let groups: TargetGroupDetail[] = []

export function resetTargetGroupStore(): void {
  groups = DEMO_TARGET_GROUPS.map((g) => structuredClone(g))
}

function withCounts(group: TargetGroupDetail): TargetGroupDetail {
  return ensureEntitySlug({
    ...group,
    personaCount: group.linkedPersonas.length,
    knowledgeEntries: group.knowledgeEntries ?? [],
    documents: group.documents ?? [],
  })
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
        slug: persona.slug,
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
    const { linkedPersonas: _lp, knowledgeEntries: _ke, documents: _docs, ...summary } = detail
    return summary
  })
  return { items, total: items.length, page: 1, pageSize: 50 }
}

function memoryTargetGroupDetail(id: string): TargetGroupDetail | null {
  const found = groups.find(
    (g) => g.id === id || g.slug === id || ensureEntitySlug(g).slug === id,
  )
  return found ? withCounts(found) : null
}

function memoryTargetGroupForPersona(personaId: string): TargetGroupDetail | null {
  const found = groups.find((g) => g.linkedPersonas.some((p) => p.id === personaId))
  return found ? withCounts(found) : null
}

function takenMemoryTgSlugs(excludeId?: string): string[] {
  return groups
    .filter((g) => !(excludeId && g.id === excludeId))
    .map((g) => ensureEntitySlug(g).slug)
}

async function memoryCreateTargetGroup(payload: TargetGroupWritePayload): Promise<TargetGroupDetail> {
  const id = `tg-${slugifyName(payload.name)}-${Date.now().toString(36)}`
  const projectId = payload.projectId ?? null
  const slug = allocateUniqueSlug(payload.name, takenMemoryTgSlugs())
  const linkedPersonas = await resolveLinked(payload.linkedPersonaIds, [])
  const created: TargetGroupDetail = withCounts({
    id,
    slug,
    name: payload.name.trim(),
    segment: payload.segment.trim() || 'Segment',
    description: payload.description ?? null,
    status: payload.status ?? 'draft',
    personaCount: linkedPersonas.length,
    projectId,
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
  const current = memoryTargetGroupDetail(id)
  if (!current) return null
  const index = groups.findIndex((g) => g.id === current.id)
  if (index < 0) return null
  const linkedPersonas = await resolveLinked(payload.linkedPersonaIds, current.linkedPersonas)
  const nextName = payload.name?.trim() ?? current.name
  const nameChanged = Boolean(payload.name?.trim() && payload.name.trim() !== current.name)
  const nextProjectId =
    payload.projectId !== undefined ? payload.projectId : current.projectId
  const slug =
    nameChanged || !current.slug?.trim()
      ? allocateUniqueSlug(nextName, takenMemoryTgSlugs(current.id), current.slug)
      : current.slug
  const next = withCounts({
    ...current,
    slug,
    name: nextName,
    segment: payload.segment?.trim() ?? current.segment,
    description: payload.description !== undefined ? payload.description : current.description,
    status: payload.status ?? current.status,
    projectId: nextProjectId,
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

export async function storeDeleteTargetGroup(id: string): Promise<boolean> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeleteTargetGroup(id)
  }
  const before = groups.length
  groups = groups.filter((g) => g.id !== id)
  return groups.length < before
}

/** Remove persona from every TG link list (memory + Postgres). */
export async function unlinkPersonaFromAllTargetGroups(personaId: string): Promise<void> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    await db.dbUnlinkPersonaFromAllTargetGroups(personaId)
    return
  }
  groups = groups.map((g) => {
    if (!g.linkedPersonas.some((p) => p.id === personaId)) return g
    const linkedPersonas = g.linkedPersonas.filter((p) => p.id !== personaId)
    return withCounts({
      ...g,
      linkedPersonas,
      updatedAt: new Date().toISOString(),
    })
  })
}
