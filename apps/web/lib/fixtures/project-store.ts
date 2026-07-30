import type {
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

let projects: ProjectDetail[] = DEMO_PROJECTS.map((p) => structuredClone(p))

export function resetProjectStore(): void {
  projects = DEMO_PROJECTS.map((p) => structuredClone(p))
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
    // Keep chapters; still update flattened companyContext via withDerived join from chapters only
    return existing
  }
  return current
    ? resolveKnowledgeChapters(current.knowledgeChapters, current.companyContext)
    : []
}

export function storeProjectList(): ProjectList {
  const items = projects.map(toSummary)
  return { items, total: items.length, page: 1, pageSize: 50 }
}

export function storeProjectDetail(id: string): ProjectDetail | null {
  const found = projects.find((p) => p.id === id)
  return found ? withDerived(found) : null
}

export function storeCreateProject(payload: ProjectWritePayload): ProjectDetail {
  const slug =
    payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'new'
  const id = `proj-${slug}-${Date.now().toString(36)}`
  const knowledgeChapters = chaptersFromWrite(payload)
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
    members: [
      {
        id: `mem-${Date.now().toString(36)}`,
        email: 'you@local.example',
        role: 'owner',
        status: 'active',
      },
    ],
  })
  projects = [created, ...projects]
  return created
}

export function storePatchProject(
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
    updatedAt: new Date().toISOString(),
  })
  projects = [...projects.slice(0, index), next, ...projects.slice(index + 1)]
  return next
}
