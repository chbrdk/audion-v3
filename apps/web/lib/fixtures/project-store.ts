/**
 * Project persistence facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 */
import type {
  ProjectCreateOptions,
  ProjectDetail,
  ProjectKnowledgeChapter,
  ProjectList,
  ProjectWritePayload,
} from '@audion-v3/contracts'
import { DEMO_PROJECTS } from './projects'
import { storePersonaList } from './persona-store'
import { storeTargetGroupList } from './target-group-store'
import {
  joinCompanyContext,
  newKnowledgeChapterId,
  resolveKnowledgeChapters,
} from '../project-knowledge'
import { isProjectsDatabaseConfigured } from '../db/config'

async function dbApi() {
  return import('../db/projects')
}

let projects: ProjectDetail[] = DEMO_PROJECTS.map((p) => structuredClone(p))

/** Inbound Plexon user provisioning shadow (fixture; not yet Postgres). */
let provisionedUsers = new Map<
  string,
  { email: string; name: string | null; desiredState: string }
>()

export function resetProjectStore(): void {
  projects = DEMO_PROJECTS.map((p) => structuredClone(p))
  provisionedUsers = new Map()
}

export function storeProvisionedUser(
  plexonUserId: string,
  data: { email: string; name: string | null; desiredState: string },
): void {
  provisionedUsers.set(plexonUserId, data)
}

export function storeGetProvisionedUser(plexonUserId: string) {
  return provisionedUsers.get(plexonUserId) ?? null
}

function countsFor(projectId: string): { personaCount: number; targetGroupCount: number } {
  const personas = storePersonaList().items.filter((p) => p.projectId === projectId).length
  const groups = storeTargetGroupList().items.filter((g) => g.projectId === projectId).length
  return { personaCount: personas, targetGroupCount: groups }
}

function withDerived(project: ProjectDetail): ProjectDetail {
  const counts = countsFor(project.id)
  const knowledgeChapters = resolveKnowledgeChapters(
    project.knowledgeChapters,
    project.companyContext,
  )
  return {
    ...project,
    ...counts,
    knowledgeChapters,
    companyContext: joinCompanyContext(knowledgeChapters) ?? project.companyContext,
    memberCount: project.members.filter((m) => m.status !== 'removed').length,
  }
}

function toSummary(project: ProjectDetail) {
  const detail = withDerived(project)
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

function memoryGetByPlatformProjectId(platformProjectId: string): ProjectDetail | null {
  const existing = projects.find((p) => p.platformProjectId === platformProjectId)
  return existing ? withDerived(existing) : null
}

function memoryProjectList(): ProjectList {
  const items = projects.map(toSummary)
  return { items, total: items.length, page: 1, pageSize: 50 }
}

function memoryProjectDetail(id: string): ProjectDetail | null {
  const found = projects.find((p) => p.id === id)
  return found ? withDerived(found) : null
}

function memoryCreateProject(
  payload: ProjectWritePayload,
  options?: ProjectCreateOptions,
): ProjectDetail {
  const slug =
    payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'new'
  const id = `proj-${slug}-${Date.now().toString(36)}`
  const knowledgeChapters = chaptersFromWrite(payload)
  const ownerEmail = options?.ownerEmail?.trim() || 'you@local.example'
  const created: ProjectDetail = withDerived({
    id,
    name: payload.name.trim(),
    nameDe: payload.nameDe ?? null,
    description: payload.description ?? null,
    companyContext: joinCompanyContext(knowledgeChapters),
    knowledgeChapters,
    status: payload.status ?? 'draft',
    personaCount: 0,
    targetGroupCount: 0,
    memberCount: 1,
    updatedAt: new Date().toISOString(),
    platformProjectId: payload.platformProjectId ?? null,
    platformCompanyId: payload.platformCompanyId ?? options?.platformCompanyId ?? null,
    ownerPlexonUserId: payload.ownerPlexonUserId ?? options?.ownerPlexonUserId ?? null,
    members: [
      {
        id: `mem-${Date.now().toString(36)}`,
        email: ownerEmail,
        role: 'owner',
        status: 'active',
      },
    ],
  })
  projects = [created, ...projects]
  return created
}

function memoryPatchProject(
  id: string,
  payload: Partial<ProjectWritePayload>,
): ProjectDetail | null {
  const index = projects.findIndex((p) => p.id === id)
  if (index < 0) return null
  const current = projects[index]!
  const knowledgeChapters = chaptersFromWrite(payload, current)
  const next = withDerived({
    ...current,
    name: payload.name?.trim() ?? current.name,
    nameDe: payload.nameDe !== undefined ? payload.nameDe : current.nameDe,
    description: payload.description !== undefined ? payload.description : current.description,
    knowledgeChapters,
    companyContext: joinCompanyContext(knowledgeChapters),
    status: payload.status ?? current.status,
    members: payload.members !== undefined ? payload.members : current.members,
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
    updatedAt: new Date().toISOString(),
  })
  projects = [...projects.slice(0, index), next, ...projects.slice(index + 1)]
  return next
}

function memoryApplyPlatformBinding(
  id: string,
  binding: {
    platformProjectId: string
    platformCompanyId?: string | null
    ownerPlexonUserId?: string | null
  },
): ProjectDetail | null {
  const index = projects.findIndex((p) => p.id === id)
  if (index < 0) return null
  const current = projects[index]!
  const next = withDerived({
    ...current,
    platformProjectId: binding.platformProjectId,
    platformCompanyId: binding.platformCompanyId ?? current.platformCompanyId ?? null,
    ownerPlexonUserId: binding.ownerPlexonUserId ?? current.ownerPlexonUserId ?? null,
    updatedAt: new Date().toISOString(),
  })
  projects = [...projects.slice(0, index), next, ...projects.slice(index + 1)]
  return next
}

function memoryUpsertByPlatformProjectId(
  platformProjectId: string,
  data: {
    name: string
    platformCompanyId: string
    ownerUserId: string
    status: 'active' | 'archived'
  },
): ProjectDetail {
  const existing = projects.find((p) => p.platformProjectId === platformProjectId)
  if (existing) {
    return (
      memoryPatchProject(existing.id, {
        name: data.name,
        platformCompanyId: data.platformCompanyId,
        ownerPlexonUserId: data.ownerUserId,
        status: data.status === 'archived' ? 'archived' : existing.status,
      }) ?? existing
    )
  }
  return memoryCreateProject(
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

export async function storeGetByPlatformProjectId(
  platformProjectId: string,
): Promise<ProjectDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetByPlatformProjectId(platformProjectId)
  }
  return memoryGetByPlatformProjectId(platformProjectId)
}

export async function storeUpsertByPlatformProjectId(
  platformProjectId: string,
  data: {
    name: string
    platformCompanyId: string
    ownerUserId: string
    status: 'active' | 'archived'
  },
): Promise<ProjectDetail> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUpsertByPlatformProjectId(platformProjectId, data)
  }
  return memoryUpsertByPlatformProjectId(platformProjectId, data)
}

export async function storeProjectList(): Promise<ProjectList> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbProjectList()
  }
  return memoryProjectList()
}

export async function storeProjectDetail(id: string): Promise<ProjectDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbProjectDetail(id)
  }
  return memoryProjectDetail(id)
}

export async function storeCreateProject(
  payload: ProjectWritePayload,
  options?: ProjectCreateOptions,
): Promise<ProjectDetail> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCreateProject(payload, options)
  }
  return memoryCreateProject(payload, options)
}

export async function storeApplyPlatformBinding(
  id: string,
  binding: {
    platformProjectId: string
    platformCompanyId?: string | null
    ownerPlexonUserId?: string | null
  },
): Promise<ProjectDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbApplyPlatformBinding(id, binding)
  }
  return memoryApplyPlatformBinding(id, binding)
}

export async function storePatchProject(
  id: string,
  payload: Partial<ProjectWritePayload>,
): Promise<ProjectDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchProject(id, payload)
  }
  return memoryPatchProject(id, payload)
}
