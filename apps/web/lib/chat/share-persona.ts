/**
 * Resolve share/embed persona — Audion v3 store first, legacy FastAPI public second.
 * Spec: specs/domain/chat-embed.md · specs/api/chat.md
 */

import type { ChatSharePersona } from '@audion-v3/contracts'
import { storeSharePersona } from '../fixtures/chat-share'
import { storePersonaDetail } from '../fixtures/persona-store'
import { fetchPersonaApi } from '../persona-api-proxy'
import { allowPersonaFixtureFallback, shouldUsePersonaFixturesOnly } from '../runtime-config'

export type SharePersonaResult = ChatSharePersona | { error: string; status: number }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

function mapPersonaDetailToShare(
  persona: NonNullable<Awaited<ReturnType<typeof storePersonaDetail>>>,
  projectId: string | null,
): SharePersonaResult {
  if (projectId && persona.projectId && persona.projectId !== projectId) {
    return { error: 'Share token does not match persona project', status: 403 }
  }
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    projectId: persona.projectId,
    avatarUrl: persona.avatarUrl,
    bio: persona.bio ?? null,
  }
}

function mapPublicPersonaJson(
  json: Record<string, unknown>,
  personaId: string,
  projectId: string | null,
): SharePersonaResult {
  const mappedProjectId =
    (typeof json.project_id === 'string' ? json.project_id.trim() : '') ||
    (typeof json.projectId === 'string' ? json.projectId.trim() : '') ||
    projectId ||
    null

  if (projectId && mappedProjectId && mappedProjectId !== projectId) {
    return { error: 'Share token does not match persona project', status: 403 }
  }

  return {
    id: String(json.id ?? personaId),
    name: String(json.name ?? 'Persona'),
    role: String(json.role ?? json.headline ?? ''),
    projectId: mappedProjectId,
    avatarUrl:
      typeof json.avatar_url === 'string'
        ? json.avatar_url
        : typeof json.avatarUrl === 'string'
          ? json.avatarUrl
          : null,
    bio: typeof json.bio === 'string' ? json.bio : null,
  }
}

/** Audion v3 Postgres / in-memory store — EQC native personas live here. */
async function fetchSharePersonaFromLocalStore(
  personaId: string,
  projectId: string | null,
): Promise<SharePersonaResult | null> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return null
  return mapPersonaDetailToShare(persona, projectId)
}

/** Legacy FastAPI public share (UUID persona + project only). */
async function fetchSharePersonaFromLegacyPublicApi(
  personaId: string,
  projectId: string | null,
): Promise<SharePersonaResult | null> {
  if (!isUuid(personaId) || !projectId || !isUuid(projectId)) return null
  const qs = `?project_id=${encodeURIComponent(projectId)}`
  const live = await fetchPersonaApi(`/personas/${personaId}/public${qs}`, { method: 'GET' })
  if (!live.ok) return null
  return mapPublicPersonaJson((live.json ?? {}) as Record<string, unknown>, personaId, projectId)
}

/** Server-side share persona load for `/chat`, `/chat/embed`, and share API routes. */
export async function fetchSharePersona(
  personaId: string,
  projectId: string | null,
): Promise<SharePersonaResult> {
  const trimmedId = personaId.trim()
  const trimmedProject = projectId?.trim() || null
  if (!trimmedId) return { error: 'personaId is required', status: 400 }

  if (!shouldUsePersonaFixturesOnly()) {
    const local = await fetchSharePersonaFromLocalStore(trimmedId, trimmedProject)
    if (local && !('error' in local)) return local
    if (local && 'error' in local) return local

    const legacy = await fetchSharePersonaFromLegacyPublicApi(trimmedId, trimmedProject)
    if (legacy && !('error' in legacy)) return legacy
    if (legacy && 'error' in legacy) return legacy

    if (!allowPersonaFixtureFallback()) {
      return { error: 'Persona not found', status: 404 }
    }
  }

  return storeSharePersona(trimmedId, trimmedProject)
}
