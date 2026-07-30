import type {
  PersonaDetail,
  PersonaList,
  PersonaWritePayload,
} from '@audion-v3/contracts'
import { coerceFrustrations, coerceGoals } from '../persona-coerce'
import { normalizePersonaSections } from '../persona-notes'
import { DEMO_PERSONAS } from './personas'

/** Mutable fixture store — specs/api/personas.md */
let personas: PersonaDetail[] = DEMO_PERSONAS.map((p) => structuredClone(p))

const DETAIL_ONLY_KEYS = [
  'age',
  'location',
  'bio',
  'gender',
  'attentionSpan',
  'colorPalette',
  'mediaAffinity',
  'confidence',
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
] as const

function toSummary(persona: PersonaDetail) {
  const summary = { ...persona }
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
  | 'traits'
  | 'interests'
  | 'values'
  | 'socialMediaUsage'
  | 'communicationStyle'
  | 'visuals'
> {
  return {
    gender: null,
    attentionSpan: null,
    colorPalette: [],
    mediaAffinity: null,
    confidence: null,
    traits: {},
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    visuals: null,
  }
}

export function resetPersonaStore(): void {
  personas = DEMO_PERSONAS.map((p) => structuredClone(p))
}

export function storePersonaList(): PersonaList {
  return {
    items: personas.map(toSummary),
    total: personas.length,
    page: 1,
    pageSize: 50,
  }
}

export function storePersonaDetail(id: string): PersonaDetail | null {
  return personas.find((p) => p.id === id) ?? null
}

export function storeCreatePersona(payload: PersonaWritePayload): PersonaDetail {
  const id = `persona-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const created: PersonaDetail = {
    id,
    name: payload.name.trim(),
    role: payload.role.trim() || 'Persona',
    projectId: payload.projectId ?? null,
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
  }
  personas = [created, ...personas]
  return created
}

export function storePatchPersona(id: string, payload: Partial<PersonaWritePayload>): PersonaDetail | null {
  const index = personas.findIndex((p) => p.id === id)
  if (index < 0) return null
  const current = personas[index]!
  const next: PersonaDetail = {
    ...current,
    name: payload.name?.trim() ?? current.name,
    role: payload.role?.trim() ?? current.role,
    status: payload.status ?? current.status,
    archetype: payload.archetype !== undefined ? payload.archetype : current.archetype,
    projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
    age: payload.age !== undefined ? payload.age : current.age,
    location: payload.location !== undefined ? payload.location : current.location,
    bio: payload.bio !== undefined ? payload.bio : current.bio,
    gender: payload.gender !== undefined ? payload.gender : current.gender,
    attentionSpan: payload.attentionSpan !== undefined ? payload.attentionSpan : current.attentionSpan,
    colorPalette: payload.colorPalette !== undefined ? payload.colorPalette : current.colorPalette,
    mediaAffinity: payload.mediaAffinity !== undefined ? payload.mediaAffinity : current.mediaAffinity,
    confidence: payload.confidence !== undefined ? payload.confidence : current.confidence,
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
    avatarUrl:
      payload.avatarUrl !== undefined
        ? payload.avatarUrl?.trim()
          ? payload.avatarUrl.trim()
          : null
        : current.avatarUrl,
    updatedAt: new Date().toISOString(),
  }
  personas = [...personas.slice(0, index), next, ...personas.slice(index + 1)]
  return next
}
