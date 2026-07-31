import type {
  ProjectDetail,
  ProjectList,
  ProjectStatus,
  ProjectSummary,
} from '@audion-v3/contracts'
import { storeProjectDetail, storeProjectList } from './fixtures/project-store'
import { normalizeKnowledgeChapters } from './project-knowledge'
import {
  allowPersonaFixtureFallback,
  getPersonaBackendBase,
  shouldUsePersonaFixturesOnly,
} from './runtime-config'

export type ProjectDataOrigin = 'api' | 'fixtures'
export type ProjectListResult = ProjectList & { origin: ProjectDataOrigin }
export type ProjectDetailResult = {
  project: ProjectDetail | null
  origin: ProjectDataOrigin
}

function normalizeStatus(value: unknown): ProjectStatus {
  if (value === 'archived' || value === 'draft') return value
  if (value === 'published' || value === 'active') return 'published'
  return 'draft'
}

export function normalizeProjectSummary(raw: unknown): ProjectSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : null
  const name = typeof item.name === 'string' ? item.name : null
  if (!id || !name) return null
  return {
    id,
    name,
    nameDe:
      typeof item.nameDe === 'string'
        ? item.nameDe
        : typeof item.name_de === 'string'
          ? item.name_de
          : null,
    description: typeof item.description === 'string' ? item.description : null,
    companyContext:
      typeof item.companyContext === 'string'
        ? item.companyContext
        : typeof item.company_context === 'string'
          ? item.company_context
          : null,
    status: normalizeStatus(item.status),
    personaCount:
      typeof item.personaCount === 'number'
        ? item.personaCount
        : typeof item.persona_count === 'number'
          ? item.persona_count
          : 0,
    targetGroupCount:
      typeof item.targetGroupCount === 'number'
        ? item.targetGroupCount
        : typeof item.target_group_count === 'number'
          ? item.target_group_count
          : 0,
    memberCount:
      typeof item.memberCount === 'number'
        ? item.memberCount
        : typeof item.member_count === 'number'
          ? item.member_count
          : 0,
    updatedAt:
      typeof item.updatedAt === 'string'
        ? item.updatedAt
        : typeof item.updated_at === 'string'
          ? item.updated_at
          : null,
  }
}

export function normalizeProjectDetail(raw: unknown): ProjectDetail | null {
  const summary = normalizeProjectSummary(raw)
  if (!summary || !raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const membersRaw = Array.isArray(item.members) ? item.members : []
  const members = membersRaw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => {
      const id = typeof m.id === 'string' ? m.id : null
      const email = typeof m.email === 'string' ? m.email : null
      if (!id || !email) return null
      const status: 'active' | 'invited' | 'removed' =
        m.status === 'invited' || m.status === 'removed' || m.status === 'active'
          ? m.status
          : 'active'
      return {
        id,
        email,
        role: typeof m.role === 'string' ? m.role : 'member',
        status,
      }
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
  const knowledgeChapters = normalizeKnowledgeChapters(
    item.knowledgeChapters ?? item.knowledge_chapters,
  )
  return {
    ...summary,
    memberCount: members.length || summary.memberCount,
    members,
    knowledgeChapters,
  }
}

export function filterProjectList(list: ProjectList, query: string): ProjectList {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const items = list.items.filter((item) =>
    [item.name, item.nameDe || '', item.description || '', item.companyContext || ''].some((v) =>
      v.toLowerCase().includes(q),
    ),
  )
  return { ...list, items, total: items.length }
}

/** Union API rows with in-memory fixture projects (Plexon provisioning writes fixtures). */
export function mergeProjectLists(primary: ProjectList, fixtures: ProjectList): ProjectList {
  const byId = new Map<string, ProjectSummary>()
  for (const item of fixtures.items) byId.set(item.id, item)
  for (const item of primary.items) byId.set(item.id, item)
  const items = Array.from(byId.values()).sort((a, b) => {
    const aAt = a.updatedAt || ''
    const bAt = b.updatedAt || ''
    return bAt.localeCompare(aAt)
  })
  return {
    items,
    total: items.length,
    page: primary.page,
    pageSize: Math.max(primary.pageSize, fixtures.pageSize, items.length),
  }
}

async function fetchJson(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchProjectList(): Promise<ProjectListResult> {
  const fixtures = await storeProjectList()
  if (shouldUsePersonaFixturesOnly()) {
    return { ...fixtures, origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/projects?page=1&page_size=50`)
    if (!response.ok) throw new Error(`Project list failed: ${response.status}`)
    const json = (await response.json()) as {
      items?: unknown[]
      total?: number
      page?: number
      page_size?: number
    }
    const items = Array.isArray(json.items)
      ? json.items.map(normalizeProjectSummary).filter((i): i is ProjectSummary => Boolean(i))
      : []
    const fromApi: ProjectList = {
      items,
      total: typeof json.total === 'number' ? json.total : items.length,
      page: typeof json.page === 'number' ? json.page : 1,
      pageSize: typeof json.page_size === 'number' ? json.page_size : 50,
    }
    // Persistable / fixture projects (incl. Plexon provisioning) always surface in the UI.
    return { ...mergeProjectLists(fromApi, fixtures), origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { ...fixtures, origin: 'fixtures' }
  }
}

export async function fetchProjectDetail(id: string): Promise<ProjectDetailResult> {
  const fixture = await storeProjectDetail(id)
  if (shouldUsePersonaFixturesOnly()) {
    return { project: fixture, origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/projects/${id}`)
    if (response.status === 404) {
      return { project: fixture, origin: fixture ? 'fixtures' : 'api' }
    }
    if (!response.ok) throw new Error(`Project detail failed: ${response.status}`)
    return { project: normalizeProjectDetail(await response.json()), origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { project: fixture, origin: 'fixtures' }
  }
}
