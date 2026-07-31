import type {
  UxStudyDetail,
  UxStudyList,
  UxStudySummary,
  UxWaveCompareDelta,
  UxWaveDetail,
} from '@audion-v3/contracts'
import {
  storeCompareUxWaves,
  storeUxStudyDetail,
  storeUxStudyList,
  storeUxWaveDetail,
} from './fixtures/ux-study-store'
import {
  allowPersonaFixtureFallback,
  getPersonaBackendBase,
  shouldUsePersonaFixturesOnly,
} from './runtime-config'

export type UxStudyDataOrigin = 'api' | 'fixtures'
export type UxStudyListResult = UxStudyList & { origin: UxStudyDataOrigin }

function normalizeStudySummary(raw: unknown): UxStudySummary | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : null
  const name = typeof item.name === 'string' ? item.name : null
  if (!id || !name) return null
  const status =
    item.status === 'draft' || item.status === 'active' || item.status === 'archived'
      ? item.status
      : 'draft'
  return {
    id,
    name,
    status,
    projectId:
      typeof item.projectId === 'string'
        ? item.projectId
        : typeof item.project_id === 'string'
          ? item.project_id
          : null,
    sourceGuide:
      typeof item.sourceGuide === 'string'
        ? item.sourceGuide
        : typeof item.source_guide === 'string'
          ? item.source_guide
          : null,
    targetUrlKey:
      typeof item.targetUrlKey === 'string'
        ? item.targetUrlKey
        : typeof item.target_url_key === 'string'
          ? item.target_url_key
          : null,
    waveCount:
      typeof item.waveCount === 'number'
        ? item.waveCount
        : typeof item.wave_count === 'number'
          ? item.wave_count
          : 0,
    updatedAt:
      typeof item.updatedAt === 'string'
        ? item.updatedAt
        : typeof item.updated_at === 'string'
          ? item.updated_at
          : null,
  }
}

export function filterUxStudyList(list: UxStudyList, query: string): UxStudyList {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const items = list.items.filter((item) =>
    [item.name, item.sourceGuide || '', item.targetUrlKey || ''].some((v) =>
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

export async function fetchUxStudyList(): Promise<UxStudyListResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { ...(await storeUxStudyList()), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/ux-studies?page=1&page_size=50`)
    if (!response.ok) throw new Error(`UX study list failed: ${response.status}`)
    const json = (await response.json()) as {
      items?: unknown[]
      total?: number
      page?: number
      page_size?: number
    }
    const items = Array.isArray(json.items)
      ? json.items.map(normalizeStudySummary).filter((i): i is UxStudySummary => Boolean(i))
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
    return { ...(await storeUxStudyList()), origin: 'fixtures' }
  }
}

export async function fetchUxStudyDetail(
  id: string,
): Promise<{ study: UxStudyDetail | null; origin: UxStudyDataOrigin }> {
  if (shouldUsePersonaFixturesOnly()) {
    return { study: await storeUxStudyDetail(id), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/ux-studies/${id}`)
    if (response.status === 404) return { study: null, origin: 'api' }
    if (!response.ok) throw new Error(`UX study detail failed: ${response.status}`)
    const study = await storeUxStudyDetail(id)
    // When API returns, prefer live JSON shape via store fallback only if needed
    const json = await response.json()
    return {
      study: (json as UxStudyDetail) ?? study,
      origin: 'api',
    }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { study: await storeUxStudyDetail(id), origin: 'fixtures' }
  }
}

export async function fetchUxWaveDetail(
  studyId: string,
  waveId: string,
): Promise<{ wave: UxWaveDetail | null; origin: UxStudyDataOrigin }> {
  if (shouldUsePersonaFixturesOnly()) {
    return { wave: await storeUxWaveDetail(studyId, waveId), origin: 'fixtures' }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/ux-studies/${studyId}/waves/${waveId}`)
    if (response.status === 404) return { wave: null, origin: 'api' }
    if (!response.ok) throw new Error(`UX wave detail failed: ${response.status}`)
    return { wave: (await response.json()) as UxWaveDetail, origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { wave: await storeUxWaveDetail(studyId, waveId), origin: 'fixtures' }
  }
}

export async function fetchUxWaveCompare(
  studyId: string,
  waveId: string,
  otherWaveId: string,
): Promise<{ delta: UxWaveCompareDelta | null; origin: UxStudyDataOrigin }> {
  if (shouldUsePersonaFixturesOnly()) {
    return {
      delta: await storeCompareUxWaves(studyId, waveId, otherWaveId),
      origin: 'fixtures',
    }
  }
  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(
      `${base}/ux-studies/${studyId}/waves/${waveId}/compare/${otherWaveId}`,
    )
    if (!response.ok) throw new Error(`UX wave compare failed: ${response.status}`)
    return { delta: (await response.json()) as UxWaveCompareDelta, origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return {
      delta: await storeCompareUxWaves(studyId, waveId, otherWaveId),
      origin: 'fixtures',
    }
  }
}
