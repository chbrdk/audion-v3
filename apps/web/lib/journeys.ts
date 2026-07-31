import type {
  JourneyDetail,
  JourneyElementKind,
  JourneyList,
  JourneyPhase,
  JourneyPhaseElement,
  JourneyStatus,
  JourneySummary,
} from '@audion-v3/contracts'
import { storeJourneyDetail, storeJourneyList } from './fixtures/journey-store'
import {
  allowPersonaFixtureFallback,
  getPersonaBackendBase,
  shouldUsePersonaFixturesOnly,
} from './runtime-config'

export type JourneyDataOrigin = 'api' | 'fixtures'
export type JourneyListResult = JourneyList & { origin: JourneyDataOrigin }
export type JourneyDetailResult = {
  journey: JourneyDetail | null
  origin: JourneyDataOrigin
}

function normalizeStatus(value: unknown): JourneyStatus {
  if (value === 'active' || value === 'archived' || value === 'draft') return value
  return 'draft'
}

function normalizeKind(value: unknown): JourneyElementKind {
  if (
    value === 'action' ||
    value === 'thought' ||
    value === 'feeling' ||
    value === 'pain' ||
    value === 'opportunity' ||
    value === 'other'
  ) {
    return value
  }
  return 'other'
}

function normalizeElement(raw: unknown, index: number): JourneyPhaseElement | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : `el-${index}`
  const label = typeof item.label === 'string' ? item.label : typeof item.text === 'string' ? item.text : null
  if (!label) return null
  return {
    id,
    kind: normalizeKind(item.kind ?? item.type),
    label,
    order: typeof item.order === 'number' ? item.order : index,
  }
}

function normalizePhase(raw: unknown, index: number): JourneyPhase | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : `phase-${index}`
  const name = typeof item.name === 'string' ? item.name : typeof item.title === 'string' ? item.title : null
  if (!name) return null
  const elementsRaw = Array.isArray(item.elements) ? item.elements : []
  const elements = elementsRaw
    .map((el, i) => normalizeElement(el, i))
    .filter((el): el is JourneyPhaseElement => Boolean(el))
    .sort((a, b) => a.order - b.order)
  return {
    id,
    name,
    order: typeof item.order === 'number' ? item.order : index,
    summary: typeof item.summary === 'string' ? item.summary : typeof item.description === 'string' ? item.description : null,
    elements,
  }
}

export function normalizeJourneySummary(raw: unknown): JourneySummary | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : null
  const name = typeof item.name === 'string' ? item.name : null
  if (!id || !name) return null
  return {
    id,
    name,
    journeyType:
      typeof item.journeyType === 'string'
        ? item.journeyType
        : typeof item.journey_type === 'string'
          ? item.journey_type
          : 'journey',
    status: normalizeStatus(item.status),
    phaseCount:
      typeof item.phaseCount === 'number'
        ? item.phaseCount
        : typeof item.phase_count === 'number'
          ? item.phase_count
          : 0,
    targetGroupId:
      typeof item.targetGroupId === 'string'
        ? item.targetGroupId
        : typeof item.target_group_id === 'string'
          ? item.target_group_id
          : null,
    targetGroupName:
      typeof item.targetGroupName === 'string'
        ? item.targetGroupName
        : typeof item.target_group_name === 'string'
          ? item.target_group_name
          : null,
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

export function normalizeJourneyDetail(raw: unknown): JourneyDetail | null {
  const summary = normalizeJourneySummary(raw)
  if (!summary || !raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const phasesRaw = Array.isArray(item.phases) ? item.phases : []
  const phases = phasesRaw
    .map((phase, i) => normalizePhase(phase, i))
    .filter((phase): phase is JourneyPhase => Boolean(phase))
    .sort((a, b) => a.order - b.order)
  return {
    ...summary,
    description: typeof item.description === 'string' ? item.description : null,
    phaseCount: phases.length || summary.phaseCount,
    phases,
  }
}

export function filterJourneyList(list: JourneyList, query: string): JourneyList {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const items = list.items.filter((item) =>
    [item.name, item.journeyType, item.targetGroupName || ''].some((v) =>
      v.toLowerCase().includes(q),
    ),
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

export async function fetchJourneyList(): Promise<JourneyListResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { ...(await storeJourneyList()), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/journeys?page=1&page_size=50`)
    if (!response.ok) throw new Error(`Journey list failed: ${response.status}`)
    const json = (await response.json()) as {
      items?: unknown[]
      total?: number
      page?: number
      page_size?: number
    }
    const items = Array.isArray(json.items)
      ? json.items.map(normalizeJourneySummary).filter((i): i is JourneySummary => Boolean(i))
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
    return { ...(await storeJourneyList()), origin: 'fixtures' }
  }
}

export async function fetchJourneyDetail(id: string): Promise<JourneyDetailResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { journey: await storeJourneyDetail(id), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/journeys/${id}`)
    if (response.status === 404) return { journey: null, origin: 'api' }
    if (!response.ok) throw new Error(`Journey detail failed: ${response.status}`)
    return { journey: normalizeJourneyDetail(await response.json()), origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { journey: await storeJourneyDetail(id), origin: 'fixtures' }
  }
}
