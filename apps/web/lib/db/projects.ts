import { desc, eq } from 'drizzle-orm'
import type {
  ProjectCreateOptions,
  ProjectDetail,
  ProjectKnowledgeChapter,
  ProjectList,
  ProjectStatus,
  ProjectWritePayload,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { projects, type ProjectRow } from './schema'
import { dbCountPersonasByProjectId } from './personas'
import { dbCountTargetGroupsByProjectId } from './target-groups'
import {
  joinCompanyContext,
  newKnowledgeChapterId,
  resolveKnowledgeChapters,
} from '../project-knowledge'

async function countsFor(
  projectId: string,
): Promise<{ personaCount: number; targetGroupCount: number }> {
  const [personaCount, targetGroupCount] = await Promise.all([
    dbCountPersonasByProjectId(projectId),
    dbCountTargetGroupsByProjectId(projectId),
  ])
  return { personaCount, targetGroupCount }
}

function normalizeStatus(value: string | null | undefined): ProjectStatus {
  if (value === 'archived' || value === 'published' || value === 'draft') return value
  return 'draft'
}

async function rowToDetail(row: ProjectRow): Promise<ProjectDetail> {
  const knowledgeChapters = resolveKnowledgeChapters(
    row.knowledgeChapters ?? [],
    row.companyContext,
  )
  const members = Array.isArray(row.members) ? row.members : []
  const counts = await countsFor(row.id)
  return {
    id: row.id,
    name: row.name,
    nameDe: row.nameDe ?? null,
    description: row.description ?? null,
    companyContext: joinCompanyContext(knowledgeChapters) ?? row.companyContext ?? null,
    knowledgeChapters,
    status: normalizeStatus(row.status),
    personaCount: counts.personaCount,
    targetGroupCount: counts.targetGroupCount,
    memberCount: members.filter((m) => m.status !== 'removed').length,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    platformProjectId: row.platformProjectId ?? null,
    platformCompanyId: row.platformCompanyId ?? null,
    ownerPlexonUserId: row.ownerPlexonUserId ?? null,
    members,
  }
}

function toSummary(detail: ProjectDetail) {
  const { members: _m, knowledgeChapters: _k, ...summary } = detail
  return summary
}

function chaptersFromWrite(
  payload: Partial<ProjectWritePayload>,
  current?: ProjectDetail,
): ProjectKnowledgeChapter[] {
  if (payload.knowledgeChapters !== undefined) {
    return payload.knowledgeChapters.map((c) => ({
      id: c.id || newKnowledgeChapterId(),
      title: c.title.trim() || 'Untitled',
      body: c.body ?? '',
    }))
  }
  if (payload.companyContext !== undefined) {
    const brief = payload.companyContext?.trim() || ''
    const existing = current
      ? resolveKnowledgeChapters(current.knowledgeChapters, current.companyContext)
      : []
    if (!brief) return []
    if (existing.length === 1 && existing[0]!.title === 'Brief') {
      return [{ ...existing[0]!, body: brief }]
    }
    if (existing.length === 0) {
      return [{ id: newKnowledgeChapterId(), title: 'Brief', body: brief }]
    }
    return existing
  }
  return current
    ? resolveKnowledgeChapters(current.knowledgeChapters, current.companyContext)
    : []
}

export async function dbProjectList(): Promise<ProjectList> {
  const db = getDb()
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt))
  const items = await Promise.all(rows.map(async (row) => toSummary(await rowToDetail(row))))
  return { items, total: items.length, page: 1, pageSize: Math.max(50, items.length) }
}

export async function dbProjectDetail(id: string): Promise<ProjectDetail | null> {
  const db = getDb()
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  const row = rows[0]
  return row ? rowToDetail(row) : null
}

export async function dbGetByPlatformProjectId(
  platformProjectId: string,
): Promise<ProjectDetail | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.platformProjectId, platformProjectId))
    .limit(1)
  const row = rows[0]
  return row ? rowToDetail(row) : null
}

export async function dbCreateProject(
  payload: ProjectWritePayload,
  options?: ProjectCreateOptions,
): Promise<ProjectDetail> {
  const slug =
    payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'new'
  const id = `proj-${slug}-${Date.now().toString(36)}`
  const knowledgeChapters = chaptersFromWrite(payload)
  const ownerEmail = options?.ownerEmail?.trim() || 'you@local.example'
  const members = [
    {
      id: `mem-${Date.now().toString(36)}`,
      email: ownerEmail,
      role: 'owner',
      status: 'active' as const,
    },
  ]
  const companyContext = joinCompanyContext(knowledgeChapters)
  const now = new Date()
  const db = getDb()
  await db.insert(projects).values({
    id,
    name: payload.name.trim(),
    nameDe: payload.nameDe ?? null,
    description: payload.description ?? null,
    companyContext,
    status: payload.status ?? 'draft',
    platformProjectId: payload.platformProjectId ?? null,
    platformCompanyId: payload.platformCompanyId ?? options?.platformCompanyId ?? null,
    ownerPlexonUserId: payload.ownerPlexonUserId ?? options?.ownerPlexonUserId ?? null,
    members,
    knowledgeChapters,
    updatedAt: now,
    createdAt: now,
  })
  const created = await dbProjectDetail(id)
  if (!created) throw new Error('Failed to create project')
  return created
}

export async function dbPatchProject(
  id: string,
  payload: Partial<ProjectWritePayload>,
): Promise<ProjectDetail | null> {
  const current = await dbProjectDetail(id)
  if (!current) return null
  const knowledgeChapters = chaptersFromWrite(payload, current)
  const nextMembers = payload.members !== undefined ? payload.members : current.members
  const db = getDb()
  await db
    .update(projects)
    .set({
      name: payload.name?.trim() ?? current.name,
      nameDe: payload.nameDe !== undefined ? payload.nameDe : current.nameDe,
      description: payload.description !== undefined ? payload.description : current.description,
      companyContext: joinCompanyContext(knowledgeChapters),
      status: payload.status ?? current.status,
      members: nextMembers,
      knowledgeChapters,
      platformProjectId:
        payload.platformProjectId !== undefined
          ? payload.platformProjectId
          : current.platformProjectId,
      platformCompanyId:
        payload.platformCompanyId !== undefined
          ? payload.platformCompanyId
          : current.platformCompanyId,
      ownerPlexonUserId:
        payload.ownerPlexonUserId !== undefined
          ? payload.ownerPlexonUserId
          : current.ownerPlexonUserId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
  return dbProjectDetail(id)
}

export async function dbApplyPlatformBinding(
  id: string,
  binding: {
    platformProjectId: string
    platformCompanyId?: string | null
    ownerPlexonUserId?: string | null
  },
): Promise<ProjectDetail | null> {
  const current = await dbProjectDetail(id)
  if (!current) return null
  const db = getDb()
  await db
    .update(projects)
    .set({
      platformProjectId: binding.platformProjectId,
      platformCompanyId: binding.platformCompanyId ?? current.platformCompanyId ?? null,
      ownerPlexonUserId: binding.ownerPlexonUserId ?? current.ownerPlexonUserId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
  return dbProjectDetail(id)
}

export async function dbUpsertByPlatformProjectId(
  platformProjectId: string,
  data: {
    name: string
    platformCompanyId: string
    ownerUserId: string
    status: 'active' | 'archived'
  },
): Promise<ProjectDetail> {
  const existing = await dbGetByPlatformProjectId(platformProjectId)
  if (existing) {
    return (
      (await dbPatchProject(existing.id, {
        name: data.name,
        platformCompanyId: data.platformCompanyId,
        ownerPlexonUserId: data.ownerUserId,
        status: data.status === 'archived' ? 'archived' : existing.status,
      })) ?? existing
    )
  }
  return dbCreateProject(
    {
      name: data.name,
      status: data.status === 'archived' ? 'archived' : 'draft',
      platformProjectId,
      platformCompanyId: data.platformCompanyId,
      ownerPlexonUserId: data.ownerUserId,
    },
    { ownerPlexonUserId: data.ownerUserId, platformCompanyId: data.platformCompanyId },
  )
}
