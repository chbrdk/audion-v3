import { desc, eq, inArray, sql } from 'drizzle-orm'
import type {
  PersonaDetail,
  PersonaList,
  PersonaStatus,
  PersonaWritePayload,
} from '@audion-v3/contracts'
import { allocateUniqueSlug, ensureEntitySlug, slugifyName } from '../entity-slug'
import { coerceFrustrations, coerceGoals, coerceJourneyBehavior, coerceMotivations } from '../persona-coerce'
import { normalizePersonaSections } from '../persona-notes'
import { parseTavusLanguage } from '../tavus/language'
import { parseVideoCallProvider } from '../video-call/provider'
import { getDb } from './client'
import { ensureEntitySlugSchema } from './ensure-entity-slug-schema'
import { personas, type PersonaRow } from './schema'

const DETAIL_ONLY_KEYS = [
  'age',
  'location',
  'bio',
  'gender',
  'attentionSpan',
  'colorPalette',
  'mediaAffinity',
  'confidence',
  'techLiteracy',
  'emotionalBaseline',
  'stressTriggers',
  'motivations',
  'traits',
  'interests',
  'values',
  'socialMediaUsage',
  'communicationStyle',
  'goals',
  'frustrations',
  'channels',
  'sections',
  'visuals',
  'profileDe',
  'headlineDe',
  'journeyBehavior',
  'knowledgeEntries',
  'documents',
  'tavusReplicaId',
  'tavusPersonaId',
  'tavusLanguage',
  'videoCallProvider',
  'beyAvatarId',
  'beyAgentId',
] as const

function emptyDefaults(): Pick<
  PersonaDetail,
  | 'gender'
  | 'attentionSpan'
  | 'colorPalette'
  | 'mediaAffinity'
  | 'confidence'
  | 'techLiteracy'
  | 'emotionalBaseline'
  | 'stressTriggers'
  | 'motivations'
  | 'traits'
  | 'interests'
  | 'values'
  | 'socialMediaUsage'
  | 'communicationStyle'
  | 'visuals'
  | 'tavusReplicaId'
  | 'tavusPersonaId'
  | 'tavusLanguage'
  | 'videoCallProvider'
  | 'beyAvatarId'
  | 'beyAgentId'
> {
  return {
    gender: null,
    attentionSpan: null,
    colorPalette: [],
    mediaAffinity: null,
    confidence: null,
    techLiteracy: null,
    emotionalBaseline: null,
    stressTriggers: [],
    motivations: [],
    traits: {},
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    visuals: null,
    tavusReplicaId: null,
    tavusPersonaId: null,
    tavusLanguage: null,
    videoCallProvider: null,
    beyAvatarId: null,
    beyAgentId: null,
  }
}

function normalizeStatus(value: string | null | undefined): PersonaStatus {
  if (value === 'ready' || value === 'archived' || value === 'draft') return value
  return 'draft'
}

function payloadFromDetail(detail: PersonaDetail): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key of DETAIL_ONLY_KEYS) {
    payload[key] = detail[key]
  }
  return payload
}

function rowToDetail(row: PersonaRow): PersonaDetail {
  const payload = (row.payload ?? {}) as Partial<PersonaDetail>
  return ensureEntitySlug({
    id: row.id,
    slug: row.slug ?? null,
    name: row.name,
    role: row.role,
    projectId: row.projectId ?? null,
    status: normalizeStatus(row.status),
    archetype: row.archetype ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    avatarUrl: row.avatarUrl ?? null,
    ...emptyDefaults(),
    age: payload.age ?? null,
    location: payload.location ?? null,
    bio: payload.bio ?? null,
    gender: payload.gender ?? null,
    attentionSpan: payload.attentionSpan ?? null,
    colorPalette: payload.colorPalette ?? [],
    mediaAffinity: payload.mediaAffinity ?? null,
    confidence: payload.confidence ?? null,
    techLiteracy: payload.techLiteracy ?? null,
    emotionalBaseline: payload.emotionalBaseline ?? null,
    stressTriggers: payload.stressTriggers ?? [],
    motivations: coerceMotivations(payload.motivations),
    traits: payload.traits ?? {},
    interests: payload.interests ?? [],
    values: payload.values ?? [],
    socialMediaUsage: payload.socialMediaUsage ?? [],
    communicationStyle: payload.communicationStyle ?? null,
    goals: coerceGoals(payload.goals),
    frustrations: coerceFrustrations(payload.frustrations),
    channels: payload.channels ?? [],
    sections: normalizePersonaSections(payload.sections),
    visuals: payload.visuals ?? null,
    profileDe: payload.profileDe ?? null,
    headlineDe: payload.headlineDe ?? null,
    journeyBehavior: coerceJourneyBehavior(payload.journeyBehavior),
    knowledgeEntries: payload.knowledgeEntries ?? [],
    documents: payload.documents ?? [],
    tavusReplicaId: payload.tavusReplicaId ?? null,
    tavusPersonaId: payload.tavusPersonaId ?? null,
    tavusLanguage: parseTavusLanguage(payload.tavusLanguage),
    videoCallProvider: parseVideoCallProvider(payload.videoCallProvider),
    beyAvatarId: payload.beyAvatarId ?? null,
    beyAgentId: payload.beyAgentId ?? null,
  })
}

function toSummary(detail: PersonaDetail) {
  const summary = { ...detail }
  for (const key of DETAIL_ONLY_KEYS) {
    delete (summary as Record<string, unknown>)[key]
  }
  return summary
}

function mergeWrite(current: PersonaDetail | null, payload: Partial<PersonaWritePayload>): PersonaDetail {
  const base =
    current ??
    ({
      id: '',
      slug: 'item',
      name: '',
      role: 'Persona',
      projectId: null,
      status: 'draft' as const,
      archetype: null,
      updatedAt: null,
      avatarUrl: null,
      age: null,
      location: null,
      bio: null,
      ...emptyDefaults(),
      goals: [],
      frustrations: [],
      channels: [],
      sections: [],
      profileDe: null,
      headlineDe: null,
      journeyBehavior: null,
      knowledgeEntries: [],
      documents: [],
      tavusReplicaId: null,
      tavusPersonaId: null,
      tavusLanguage: null,
      videoCallProvider: null,
      beyAvatarId: null,
      beyAgentId: null,
    } satisfies PersonaDetail)

  const nextName = payload.name?.trim() ?? base.name
  const nameChanged = Boolean(payload.name?.trim() && payload.name.trim() !== base.name)

  return {
    ...base,
    name: nextName,
    role: payload.role?.trim() ?? base.role,
    status: payload.status ?? base.status,
    archetype: payload.archetype !== undefined ? payload.archetype : base.archetype,
    projectId: payload.projectId !== undefined ? payload.projectId : base.projectId,
    age: payload.age !== undefined ? payload.age : base.age,
    location: payload.location !== undefined ? payload.location : base.location,
    bio: payload.bio !== undefined ? payload.bio : base.bio,
    gender: payload.gender !== undefined ? payload.gender : base.gender,
    attentionSpan: payload.attentionSpan !== undefined ? payload.attentionSpan : base.attentionSpan,
    colorPalette: payload.colorPalette !== undefined ? payload.colorPalette : base.colorPalette,
    mediaAffinity: payload.mediaAffinity !== undefined ? payload.mediaAffinity : base.mediaAffinity,
    confidence: payload.confidence !== undefined ? payload.confidence : base.confidence,
    techLiteracy: payload.techLiteracy !== undefined ? payload.techLiteracy : base.techLiteracy,
    emotionalBaseline:
      payload.emotionalBaseline !== undefined ? payload.emotionalBaseline : base.emotionalBaseline,
    stressTriggers: payload.stressTriggers !== undefined ? payload.stressTriggers : base.stressTriggers,
    motivations:
      payload.motivations !== undefined ? coerceMotivations(payload.motivations) : base.motivations,
    traits: payload.traits !== undefined ? payload.traits : base.traits,
    interests: payload.interests !== undefined ? payload.interests : base.interests,
    values: payload.values !== undefined ? payload.values : base.values,
    socialMediaUsage:
      payload.socialMediaUsage !== undefined ? payload.socialMediaUsage : base.socialMediaUsage,
    communicationStyle:
      payload.communicationStyle !== undefined
        ? payload.communicationStyle
        : base.communicationStyle,
    goals: payload.goals !== undefined ? coerceGoals(payload.goals) : base.goals,
    frustrations:
      payload.frustrations !== undefined ? coerceFrustrations(payload.frustrations) : base.frustrations,
    channels: payload.channels !== undefined ? payload.channels : base.channels,
    sections:
      payload.sections !== undefined ? normalizePersonaSections(payload.sections) : base.sections,
    visuals: payload.visuals !== undefined ? payload.visuals : base.visuals,
    profileDe: payload.profileDe !== undefined ? payload.profileDe : base.profileDe ?? null,
    headlineDe: payload.headlineDe !== undefined ? payload.headlineDe : base.headlineDe ?? null,
    journeyBehavior:
      payload.journeyBehavior !== undefined
        ? coerceJourneyBehavior(payload.journeyBehavior)
        : base.journeyBehavior ?? null,
    knowledgeEntries:
      payload.knowledgeEntries !== undefined
        ? payload.knowledgeEntries
        : base.knowledgeEntries ?? [],
    documents: payload.documents !== undefined ? payload.documents : base.documents ?? [],
    tavusReplicaId:
      payload.tavusReplicaId !== undefined
        ? payload.tavusReplicaId?.trim()
          ? payload.tavusReplicaId.trim()
          : null
        : base.tavusReplicaId ?? null,
    tavusPersonaId:
      payload.tavusPersonaId !== undefined
        ? payload.tavusPersonaId?.trim()
          ? payload.tavusPersonaId.trim()
          : null
        : base.tavusPersonaId ?? null,
    tavusLanguage:
      payload.tavusLanguage !== undefined
        ? parseTavusLanguage(payload.tavusLanguage)
        : base.tavusLanguage ?? null,
    videoCallProvider:
      payload.videoCallProvider !== undefined
        ? parseVideoCallProvider(payload.videoCallProvider)
        : base.videoCallProvider ?? null,
    beyAvatarId:
      payload.beyAvatarId !== undefined
        ? payload.beyAvatarId?.trim()
          ? payload.beyAvatarId.trim()
          : null
        : base.beyAvatarId ?? null,
    beyAgentId:
      payload.beyAgentId !== undefined
        ? payload.beyAgentId?.trim()
          ? payload.beyAgentId.trim()
          : null
        : base.beyAgentId ?? null,
    avatarUrl:
      payload.avatarUrl !== undefined
        ? payload.avatarUrl?.trim()
          ? payload.avatarUrl.trim()
          : null
        : base.avatarUrl,
    /** Placeholder — callers overwrite after uniqueness check. */
    slug: nameChanged ? slugifyName(nextName) : base.slug || slugifyName(nextName),
    updatedAt: new Date().toISOString(),
  }
}

async function takenPersonaSlugs(excludeId?: string): Promise<string[]> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db.select({ id: personas.id, slug: personas.slug }).from(personas)
  return rows
    .filter((r) => !(excludeId && r.id === excludeId))
    .map((r) => r.slug?.trim() || '')
    .filter(Boolean)
}

export async function dbPersonaList(): Promise<PersonaList> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db.select().from(personas).orderBy(desc(personas.updatedAt))
  const items = rows.map((row) => toSummary(rowToDetail(row)))
  return { items, total: items.length, page: 1, pageSize: Math.max(50, items.length) }
}

export async function dbPersonaDetail(ref: string): Promise<PersonaDetail | null> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const byId = await db.select().from(personas).where(eq(personas.id, ref)).limit(1)
  if (byId[0]) return rowToDetail(byId[0])
  const bySlug = await db.select().from(personas).where(eq(personas.slug, ref)).limit(1)
  return bySlug[0] ? rowToDetail(bySlug[0]) : null
}

export async function dbPersonaSummariesByIds(
  ids: string[],
): Promise<
  Array<{ id: string; slug: string; name: string; role: string; status: string; avatarUrl: string | null }>
> {
  if (ids.length === 0) return []
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db.select().from(personas).where(inArray(personas.id, ids))
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids
    .map((id) => {
      const row = byId.get(id)
      if (!row) return null
      const detail = rowToDetail(row)
      return {
        id: detail.id,
        slug: detail.slug,
        name: detail.name,
        role: detail.role,
        status: detail.status,
        avatarUrl: detail.avatarUrl ?? null,
      }
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
}

export async function dbCountPersonasByProjectId(projectId: string): Promise<number> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(personas)
    .where(eq(personas.projectId, projectId))
  return Number(rows[0]?.n ?? 0)
}

export async function dbCreatePersona(payload: PersonaWritePayload): Promise<PersonaDetail> {
  await ensureEntitySlugSchema()
  const id = `persona-${slugifyName(payload.name)}-${Date.now().toString(36)}`
  const slug = allocateUniqueSlug(payload.name, await takenPersonaSlugs())
  const detail = mergeWrite(null, { ...payload, name: payload.name, role: payload.role || 'Persona' })
  detail.id = id
  detail.slug = slug
  const now = new Date()
  const db = getDb()
  await db.insert(personas).values({
    id,
    slug,
    name: detail.name,
    role: detail.role,
    projectId: detail.projectId,
    status: detail.status,
    archetype: detail.archetype,
    avatarUrl: detail.avatarUrl,
    payload: payloadFromDetail(detail),
    updatedAt: now,
    createdAt: now,
  })
  return detail
}

export async function dbInsertPersonaDetail(detail: PersonaDetail): Promise<PersonaDetail> {
  await ensureEntitySlugSchema()
  const withSlug = ensureEntitySlug(detail)
  const now = new Date()
  const db = getDb()
  await db.insert(personas).values({
    id: withSlug.id,
    slug: withSlug.slug,
    name: withSlug.name,
    role: withSlug.role,
    projectId: withSlug.projectId,
    status: withSlug.status,
    archetype: withSlug.archetype,
    avatarUrl: withSlug.avatarUrl,
    payload: payloadFromDetail(withSlug),
    updatedAt: now,
    createdAt: now,
  })
  return { ...withSlug, updatedAt: now.toISOString() }
}

export async function dbPatchPersona(
  ref: string,
  payload: Partial<PersonaWritePayload>,
): Promise<PersonaDetail | null> {
  await ensureEntitySlugSchema()
  const current = await dbPersonaDetail(ref)
  if (!current) return null
  const next = mergeWrite(current, payload)
  next.id = current.id
  const nameChanged = Boolean(payload.name?.trim() && payload.name.trim() !== current.name)
  if (nameChanged || !current.slug?.trim()) {
    next.slug = allocateUniqueSlug(next.name, await takenPersonaSlugs(current.id), current.slug)
  } else {
    next.slug = current.slug
  }
  const db = getDb()
  await db
    .update(personas)
    .set({
      slug: next.slug,
      name: next.name,
      role: next.role,
      projectId: next.projectId,
      status: next.status,
      archetype: next.archetype,
      avatarUrl: next.avatarUrl,
      payload: payloadFromDetail(next),
      updatedAt: new Date(),
    })
    .where(eq(personas.id, current.id))
  return next
}

export async function dbDeletePersona(id: string): Promise<boolean> {
  await ensureEntitySlugSchema()
  const db = getDb()
  const resolved = await dbPersonaDetail(id)
  const canonicalId = resolved?.id ?? id
  const deleted = await db
    .delete(personas)
    .where(eq(personas.id, canonicalId))
    .returning({ id: personas.id })
  return deleted.length > 0
}
