/**
 * Persona persistence facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 */
import type {
  PersonaDetail,
  PersonaList,
  PersonaWritePayload,
} from '@audion-v3/contracts'
import { allocateUniqueSlug, ensureEntitySlug, slugifyName } from '../entity-slug'
import { coerceFrustrations, coerceGoals, coerceJourneyBehavior, coerceMotivations } from '../persona-coerce'
import { normalizePersonaSections } from '../persona-notes'
import { isProjectsDatabaseConfigured } from '../db/config'
import { parseTavusLanguage } from '../tavus/language'
import { parseVideoCallProvider } from '../video-call/provider'
import { DEMO_PERSONAS } from './personas'

async function dbApi() {
  return import('../db/personas')
}

/** Empty until create or `resetPersonaStore()` (tests). No DEMO product seed. */
let personas: PersonaDetail[] = []

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

function toSummary(persona: PersonaDetail) {
  const withSlug = ensureEntitySlug(persona)
  const summary = { ...withSlug }
  for (const key of DETAIL_ONLY_KEYS) {
    delete (summary as Record<string, unknown>)[key]
  }
  return summary
}

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

export function resetPersonaStore(): void {
  personas = DEMO_PERSONAS.map((p) => structuredClone(p))
}

function memoryPersonaList(): PersonaList {
  return {
    items: personas.map(toSummary),
    total: personas.length,
    page: 1,
    pageSize: 50,
  }
}

function memoryPersonaDetail(id: string): PersonaDetail | null {
  const found = personas.find((p) => p.id === id || p.slug === id || ensureEntitySlug(p).slug === id)
  if (!found) return null
  return ensureEntitySlug({
    ...found,
    profileDe: found.profileDe ?? null,
    headlineDe: found.headlineDe ?? null,
    journeyBehavior: found.journeyBehavior ?? null,
    knowledgeEntries: found.knowledgeEntries ?? [],
    documents: found.documents ?? [],
    tavusReplicaId: found.tavusReplicaId ?? null,
    tavusPersonaId: found.tavusPersonaId ?? null,
    tavusLanguage: found.tavusLanguage ?? null,
    videoCallProvider: found.videoCallProvider ?? null,
    beyAvatarId: found.beyAvatarId ?? null,
    beyAgentId: found.beyAgentId ?? null,
  })
}

function takenMemoryPersonaSlugs(excludeId?: string): string[] {
  return personas
    .filter((p) => !(excludeId && p.id === excludeId))
    .map((p) => ensureEntitySlug(p).slug)
}

function memoryCreatePersona(payload: PersonaWritePayload): PersonaDetail {
  const id = `persona-${slugifyName(payload.name)}-${Date.now().toString(36)}`
  const projectId = payload.projectId ?? null
  const slug = allocateUniqueSlug(payload.name, takenMemoryPersonaSlugs())
  const created: PersonaDetail = ensureEntitySlug({
    id,
    slug,
    name: payload.name.trim(),
    role: payload.role.trim() || 'Persona',
    projectId,
    status: payload.status ?? 'draft',
    archetype: payload.archetype ?? null,
    updatedAt: new Date().toISOString(),
    avatarUrl: payload.avatarUrl?.trim() ? payload.avatarUrl.trim() : null,
    age: payload.age ?? null,
    location: payload.location ?? null,
    bio: payload.bio ?? null,
    ...emptyDefaults(),
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
    journeyBehavior: coerceJourneyBehavior(payload.journeyBehavior) ?? null,
    knowledgeEntries: payload.knowledgeEntries ?? [],
    documents: payload.documents ?? [],
    tavusReplicaId: payload.tavusReplicaId?.trim() ? payload.tavusReplicaId.trim() : null,
    tavusPersonaId: payload.tavusPersonaId?.trim() ? payload.tavusPersonaId.trim() : null,
    tavusLanguage: parseTavusLanguage(payload.tavusLanguage),
    videoCallProvider: parseVideoCallProvider(payload.videoCallProvider),
    beyAvatarId: payload.beyAvatarId?.trim() ? payload.beyAvatarId.trim() : null,
    beyAgentId: payload.beyAgentId?.trim() ? payload.beyAgentId.trim() : null,
  })
  personas = [created, ...personas]
  return created
}

function memoryPatchPersona(id: string, payload: Partial<PersonaWritePayload>): PersonaDetail | null {
  const current = memoryPersonaDetail(id)
  if (!current) return null
  const index = personas.findIndex((p) => p.id === current.id)
  if (index < 0) return null
  const nextName = payload.name?.trim() ?? current.name
  const nameChanged = Boolean(payload.name?.trim() && payload.name.trim() !== current.name)
  const nextProjectId =
    payload.projectId !== undefined ? payload.projectId : current.projectId
  const slug =
    nameChanged || !current.slug?.trim()
      ? allocateUniqueSlug(nextName, takenMemoryPersonaSlugs(current.id), current.slug)
      : current.slug
  const next: PersonaDetail = ensureEntitySlug({
    ...current,
    slug,
    name: nextName,
    role: payload.role?.trim() ?? current.role,
    status: payload.status ?? current.status,
    archetype: payload.archetype !== undefined ? payload.archetype : current.archetype,
    projectId: nextProjectId,
    age: payload.age !== undefined ? payload.age : current.age,
    location: payload.location !== undefined ? payload.location : current.location,
    bio: payload.bio !== undefined ? payload.bio : current.bio,
    gender: payload.gender !== undefined ? payload.gender : current.gender,
    attentionSpan: payload.attentionSpan !== undefined ? payload.attentionSpan : current.attentionSpan,
    colorPalette: payload.colorPalette !== undefined ? payload.colorPalette : current.colorPalette,
    mediaAffinity: payload.mediaAffinity !== undefined ? payload.mediaAffinity : current.mediaAffinity,
    confidence: payload.confidence !== undefined ? payload.confidence : current.confidence,
    techLiteracy: payload.techLiteracy !== undefined ? payload.techLiteracy : current.techLiteracy,
    emotionalBaseline:
      payload.emotionalBaseline !== undefined ? payload.emotionalBaseline : current.emotionalBaseline,
    stressTriggers:
      payload.stressTriggers !== undefined ? payload.stressTriggers : current.stressTriggers,
    motivations:
      payload.motivations !== undefined ? coerceMotivations(payload.motivations) : current.motivations,
    traits: payload.traits !== undefined ? payload.traits : current.traits,
    interests: payload.interests !== undefined ? payload.interests : current.interests,
    values: payload.values !== undefined ? payload.values : current.values,
    socialMediaUsage:
      payload.socialMediaUsage !== undefined ? payload.socialMediaUsage : current.socialMediaUsage,
    communicationStyle:
      payload.communicationStyle !== undefined
        ? payload.communicationStyle
        : current.communicationStyle,
    goals: payload.goals !== undefined ? coerceGoals(payload.goals) : current.goals,
    frustrations:
      payload.frustrations !== undefined ? coerceFrustrations(payload.frustrations) : current.frustrations,
    channels: payload.channels !== undefined ? payload.channels : current.channels,
    sections:
      payload.sections !== undefined ? normalizePersonaSections(payload.sections) : current.sections,
    visuals: payload.visuals !== undefined ? payload.visuals : current.visuals,
    profileDe: payload.profileDe !== undefined ? payload.profileDe : current.profileDe ?? null,
    headlineDe:
      payload.headlineDe !== undefined ? payload.headlineDe : current.headlineDe ?? null,
    journeyBehavior:
      payload.journeyBehavior !== undefined
        ? coerceJourneyBehavior(payload.journeyBehavior)
        : current.journeyBehavior ?? null,
    knowledgeEntries:
      payload.knowledgeEntries !== undefined
        ? payload.knowledgeEntries
        : current.knowledgeEntries ?? [],
    documents: payload.documents !== undefined ? payload.documents : current.documents ?? [],
    tavusReplicaId:
      payload.tavusReplicaId !== undefined
        ? payload.tavusReplicaId?.trim()
          ? payload.tavusReplicaId.trim()
          : null
        : current.tavusReplicaId ?? null,
    tavusPersonaId:
      payload.tavusPersonaId !== undefined
        ? payload.tavusPersonaId?.trim()
          ? payload.tavusPersonaId.trim()
          : null
        : current.tavusPersonaId ?? null,
    tavusLanguage:
      payload.tavusLanguage !== undefined
        ? parseTavusLanguage(payload.tavusLanguage)
        : current.tavusLanguage ?? null,
    videoCallProvider:
      payload.videoCallProvider !== undefined
        ? parseVideoCallProvider(payload.videoCallProvider)
        : current.videoCallProvider ?? null,
    beyAvatarId:
      payload.beyAvatarId !== undefined
        ? payload.beyAvatarId?.trim()
          ? payload.beyAvatarId.trim()
          : null
        : current.beyAvatarId ?? null,
    beyAgentId:
      payload.beyAgentId !== undefined
        ? payload.beyAgentId?.trim()
          ? payload.beyAgentId.trim()
          : null
        : current.beyAgentId ?? null,
    avatarUrl:
      payload.avatarUrl !== undefined
        ? payload.avatarUrl?.trim()
          ? payload.avatarUrl.trim()
          : null
        : current.avatarUrl,
    updatedAt: new Date().toISOString(),
  })
  personas = [...personas.slice(0, index), next, ...personas.slice(index + 1)]
  return next
}

export async function storePersonaList(): Promise<PersonaList> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPersonaList()
  }
  return memoryPersonaList()
}

export async function storePersonaDetail(id: string): Promise<PersonaDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPersonaDetail(id)
  }
  return memoryPersonaDetail(id)
}

export async function storeCreatePersona(payload: PersonaWritePayload): Promise<PersonaDetail> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCreatePersona(payload)
  }
  return memoryCreatePersona(payload)
}

export async function storePatchPersona(
  id: string,
  payload: Partial<PersonaWritePayload>,
): Promise<PersonaDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchPersona(id, payload)
  }
  return memoryPatchPersona(id, payload)
}

export async function storeDeletePersona(id: string): Promise<boolean> {
  const resolved = await storePersonaDetail(id)
  const canonicalId = resolved?.id ?? id
  const { unlinkPersonaFromAllTargetGroups } = await import('./target-group-store')
  await unlinkPersonaFromAllTargetGroups(canonicalId)
  try {
    const { storeDeletePersonaPrompt } = await import('./persona-prompts-store')
    await storeDeletePersonaPrompt(canonicalId)
  } catch {
    /* prompt table optional */
  }
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeletePersona(canonicalId)
  }
  const before = personas.length
  personas = personas.filter((p) => p.id !== canonicalId)
  return personas.length < before
}
