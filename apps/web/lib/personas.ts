import type {
  PersonaCommunicationStyle,
  PersonaDetail,
  PersonaList,
  PersonaStatus,
  PersonaSummary,
  PersonaVisuals,
} from '@audion-v3/contracts'
import { coerceFrustrations, coerceGoals } from './persona-coerce'
import { normalizePersonaSections } from './persona-notes'
import { storePersonaDetail, storePersonaList } from './fixtures/persona-store'
import {
  allowPersonaFixtureFallback,
  getPersonaBackendBase,
  shouldUsePersonaFixturesOnly,
} from './runtime-config'

export { coerceFrustrations, coerceGoals } from './persona-coerce'

export type PersonaDataOrigin = 'api' | 'fixtures'

export type PersonaListResult = PersonaList & { origin: PersonaDataOrigin }
export type PersonaDetailResult = {
  persona: PersonaDetail | null
  origin: PersonaDataOrigin
}

function normalizeStatus(value: unknown): PersonaStatus {
  return value === 'ready' || value === 'archived' ? value : 'draft'
}

export function normalizePersonaSummary(raw: unknown): PersonaSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : typeof item.persona_id === 'string' ? item.persona_id : null
  const name = typeof item.name === 'string' ? item.name : null
  if (!id || !name) return null
  const avatarUrl =
    typeof item.avatarUrl === 'string'
      ? item.avatarUrl
      : typeof item.avatar_url === 'string'
        ? item.avatar_url
        : typeof item.imageUrl === 'string'
          ? item.imageUrl
          : typeof item.image_url === 'string'
            ? item.image_url
            : null
  return {
    id,
    name,
    role: typeof item.role === 'string' ? item.role : typeof item.job_title === 'string' ? item.job_title : 'Persona',
    projectId: typeof item.project_id === 'string' ? item.project_id : typeof item.projectId === 'string' ? item.projectId : null,
    status: normalizeStatus(item.status),
    archetype: typeof item.archetype === 'string' ? item.archetype : null,
    updatedAt:
      typeof item.updated_at === 'string'
        ? item.updated_at
        : typeof item.updatedAt === 'string'
          ? item.updatedAt
          : null,
    avatarUrl,
  }
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asTraits(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key.trim()) continue
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    if (Number.isFinite(n)) out[key] = Math.min(1, Math.max(0, n))
  }
  return out
}

function coerceCommunicationStyle(value: unknown): PersonaCommunicationStyle | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const vocabulary = asStringList(row.vocabulary)
  const sentenceStructure =
    typeof row.sentenceStructure === 'string'
      ? row.sentenceStructure
      : typeof row.sentence_structure === 'string'
        ? row.sentence_structure
        : null
  const skepticismLevel =
    asNumber(row.skepticismLevel) ?? asNumber(row.skepticism_level)
  if (!vocabulary.length && !sentenceStructure && skepticismLevel == null) return null
  return { vocabulary, sentenceStructure, skepticismLevel }
}

function coerceVisuals(value: unknown): PersonaVisuals | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const styleKeywords = asStringList(row.styleKeywords ?? row.style_keywords)
  const tilesRaw = Array.isArray(row.tiles) ? row.tiles : []
  const tiles = tilesRaw
    .map((tile, index) => {
      if (!tile || typeof tile !== 'object') return null
      const t = tile as Record<string, unknown>
      const imageUrl =
        typeof t.imageUrl === 'string'
          ? t.imageUrl
          : typeof t.image_url === 'string'
            ? t.image_url
            : typeof t.url === 'string'
              ? t.url
              : null
      if (!imageUrl) return null
      return {
        id: typeof t.id === 'string' ? t.id : `tile-${index}`,
        imageUrl,
        category: typeof t.category === 'string' ? t.category : 'visual',
        caption: typeof t.caption === 'string' ? t.caption : null,
      }
    })
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  if (!styleKeywords.length && !tiles.length) return null
  return { styleKeywords, tiles }
}

function pickProfileBlob(item: Record<string, unknown>): Record<string, unknown> {
  if (item.profile && typeof item.profile === 'object' && !Array.isArray(item.profile)) {
    return { ...item, ...(item.profile as Record<string, unknown>) }
  }
  return item
}

function ageAsString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function normalizePersonaDetail(raw: unknown): PersonaDetail | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const item = pickProfileBlob(root)
  const summary = normalizePersonaSummary({
    ...item,
    id: root.id ?? item.id ?? root.persona_id ?? item.persona_id,
    name: root.name ?? item.name,
    role: root.role ?? item.role ?? item.job_title ?? item.headline,
    status: root.status ?? item.status,
    project_id: root.project_id ?? root.projectId ?? item.project_id ?? item.projectId,
    projectId: root.projectId ?? item.projectId,
    archetype: root.archetype ?? item.archetype,
    updated_at: root.updated_at ?? root.updatedAt ?? item.updated_at ?? item.updatedAt,
    updatedAt: root.updatedAt ?? item.updatedAt,
    avatarUrl: root.avatarUrl ?? root.avatar_url ?? item.avatarUrl ?? item.avatar_url ?? item.imageUrl,
    avatar_url: root.avatar_url ?? item.avatar_url,
    imageUrl: root.imageUrl ?? item.imageUrl,
    image_url: root.image_url ?? item.image_url,
  })
  if (!summary) return null

  const sections = normalizePersonaSections(item.sections)
  const moodboard = root.moodboard ?? root.visuals ?? item.moodboard ?? item.visuals

  return {
    ...summary,
    age: ageAsString(item.age) ?? (typeof item.age_label === 'string' ? item.age_label : null),
    location: typeof item.location === 'string' ? item.location : null,
    bio:
      typeof item.bio === 'string'
        ? item.bio
        : typeof item.description === 'string'
          ? item.description
          : typeof item.headline === 'string'
            ? item.headline
            : null,
    gender: typeof item.gender === 'string' ? item.gender : null,
    attentionSpan:
      typeof item.attentionSpan === 'string'
        ? item.attentionSpan
        : typeof item.attention_span === 'string'
          ? item.attention_span
          : null,
    colorPalette: asStringList(item.colorPalette ?? item.color_palette),
    mediaAffinity: asNumber(item.mediaAffinity ?? item.media_affinity),
    confidence: asNumber(item.confidence),
    traits: asTraits(item.traits),
    interests: asStringList(item.interests),
    values: asStringList(item.values),
    socialMediaUsage: asStringList(item.socialMediaUsage ?? item.social_media_usage),
    communicationStyle: coerceCommunicationStyle(
      item.communicationStyle ?? item.communication_style,
    ),
    goals: coerceGoals(item.goals),
    frustrations: coerceFrustrations(item.frustrations ?? item.pain_points),
    channels: asStringList(item.channels),
    sections,
    visuals: coerceVisuals(moodboard),
    profileDe:
      item.profileDe && typeof item.profileDe === 'object'
        ? (item.profileDe as PersonaDetail['profileDe'])
        : item.profile_de && typeof item.profile_de === 'object'
          ? (item.profile_de as PersonaDetail['profileDe'])
          : null,
    headlineDe:
      typeof item.headlineDe === 'string'
        ? item.headlineDe
        : typeof item.headline_de === 'string'
          ? item.headline_de
          : null,
    knowledgeEntries: Array.isArray(item.knowledgeEntries)
      ? (item.knowledgeEntries as PersonaDetail['knowledgeEntries'])
      : Array.isArray(item.knowledge_entries)
        ? (item.knowledge_entries as PersonaDetail['knowledgeEntries'])
        : [],
    documents: Array.isArray(item.documents)
      ? (item.documents as PersonaDetail['documents'])
      : [],
  }
}

export function filterPersonaList(list: PersonaList, query: string): PersonaList {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const items = list.items.filter((item) => {
    return [item.name, item.role, item.archetype || ''].some((value) => value.toLowerCase().includes(q))
  })
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

export async function fetchPersonaList(): Promise<PersonaListResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { ...(await storePersonaList()), origin: 'fixtures' }
  }

  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/personas?page=1&page_size=50`)
    if (!response.ok) throw new Error(`Persona list failed: ${response.status}`)
    const json = (await response.json()) as {
      items?: unknown[]
      total?: number
      page?: number
      page_size?: number
    }
    const items = Array.isArray(json.items)
      ? json.items.map(normalizePersonaSummary).filter((item): item is PersonaSummary => Boolean(item))
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
    return { ...(await storePersonaList()), origin: 'fixtures' }
  }
}

export async function fetchPersonaDetail(personaId: string): Promise<PersonaDetailResult> {
  if (shouldUsePersonaFixturesOnly()) {
    return { persona: await storePersonaDetail(personaId), origin: 'fixtures' }
  }

  try {
    const base = getPersonaBackendBase({ preferPublic: false })
    const response = await fetchJson(`${base}/personas/${personaId}`)
    if (response.status === 404) return { persona: null, origin: 'api' }
    if (!response.ok) throw new Error(`Persona detail failed: ${response.status}`)
    return { persona: normalizePersonaDetail(await response.json()), origin: 'api' }
  } catch (error) {
    if (!allowPersonaFixtureFallback()) throw error
    return { persona: await storePersonaDetail(personaId), origin: 'fixtures' }
  }
}
