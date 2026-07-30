import type {
  TargetGroupDetail,
  TargetGroupList,
  TargetGroupStatus,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import {
  storeTargetGroupDetail,
  storeTargetGroupList,
} from './fixtures/target-group-store'
import {
  allowPersonaFixtureFallback,
  getPersonaBackendBase,
  shouldUsePersonaFixturesOnly,
} from './runtime-config'

export type TargetGroupDataOrigin = 'api' | 'fixtures'
export type TargetGroupListResult = TargetGroupList & { origin: TargetGroupDataOrigin }
export type TargetGroupDetailResult = {
  targetGroup: TargetGroupDetail | null
  origin: TargetGroupDataOrigin
}

function normalizeStatus(value: unknown): TargetGroupStatus {
  if (value === 'archived' || value === 'draft') return value
  if (value === 'published') return 'active'
  return 'active'
}

export function normalizeTargetGroupSummary(raw: unknown): TargetGroupSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : null
  const name = typeof item.name === 'string' ? item.name : null
  if (!id || !name) return null
  return {
    id,
    name,
    segment: typeof item.segment === 'string' ? item.segment : 'Segment',
    description: typeof item.description === 'string' ? item.description : null,
    status: normalizeStatus(item.status),
    personaCount: typeof item.personaCount === 'number' ? item.personaCount : typeof item.persona_count === 'number' ? item.persona_count : 0,
    projectId:
      typeof item.projectId === 'string'
        ? item.projectId
        : typeof item.project_id === 'string'
          ? item.project_id
          : null,
    updatedAt:
      typeof item.updatedAt === 'string'
        ? item.updatedAt
        : typeof item.updated_at === 'string'
          ? item.updated_at
          : null,
  }
}

export function normalizeTargetGroupDetail(raw: unknown): TargetGroupDetail | null {
  const summary = normalizeTargetGroupSummary(raw)
  if (!summary || !raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const personasRaw = Array.isArray(item.linkedPersonas)
    ? item.linkedPersonas
    : Array.isArray(item.personas)
      ? item.personas
      : []
  const linkedPersonas = personasRaw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => {
      const id = typeof p.id === 'string' ? p.id : typeof p.persona_id === 'string' ? p.persona_id : null
      const name = typeof p.name === 'string' ? p.name : null
      if (!id || !name) return null
      return {
        id,
        name,
        role: typeof p.role === 'string' ? p.role : typeof p.job_title === 'string' ? p.job_title : 'Persona',
        status: typeof p.status === 'string' ? p.status : 'draft',
        avatarUrl:
          typeof p.avatarUrl === 'string'
            ? p.avatarUrl
            : typeof p.avatar_url === 'string'
              ? p.avatar_url
              : null,
      }
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  return {
    ...summary,
    personaCount: linkedPersonas.length || summary.personaCount,
    linkedPersonas,
  }
}

export function filterTargetGroupList(list: TargetGroupList, query: string): TargetGroupList {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const items = list.items.filter((item) =>
    [item.name, item.segment, item.description || ''].some((v) => v.toLowerCase().includes(q)),
  )
  return { ...list, items, total: items.length }
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

export async function fetchTargetGroupList(): Promise<TargetGroupListResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { ...storeTargetGroupList(), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/target-groups?page=1&page_size=50`)
    if (!response.ok) throw new Error(`Target group list failed: ${response.status}`)
    const json = (await response.json()) as { items?: unknown[]; total?: number; page?: number; page_size?: number }
    const items = Array.isArray(json.items)
      ? json.items.map(normalizeTargetGroupSummary).filter((i): i is TargetGroupSummary => Boolean(i))
      : []
    return {
      items,
      total: typeof json.total === 'number' ? json.total : items.length,
      page: typeof json.page === 'number' ? json.page : 1,
      pageSize: typeof json.page_size === 'number' ? json.page_size : 50,
      origin: 'api',
    }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { ...storeTargetGroupList(), origin: 'fixtures' }
  }
}

export async function fetchTargetGroupDetail(id: string): Promise<TargetGroupDetailResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { targetGroup: storeTargetGroupDetail(id), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/target-groups/${id}`)
    if (response.status === 404) return { targetGroup: null, origin: 'api' }
    if (!response.ok) throw new Error(`Target group detail failed: ${response.status}`)
    return { targetGroup: normalizeTargetGroupDetail(await response.json()), origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { targetGroup: storeTargetGroupDetail(id), origin: 'fixtures' }
  }
}
