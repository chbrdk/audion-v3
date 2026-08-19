/**
 * Resolve share/embed persona — live persona-api first, fixtures fallback.
 * Spec: specs/domain/chat-embed.md · specs/api/chat.md
 */

import type { ChatSharePersona } from '@audion-v3/contracts'
import { storeSharePersona } from '../fixtures/chat-share'
import { fetchPersonaDetail } from '../personas'
import { fetchPersonaApi } from '../persona-api-proxy'
import { allowPersonaFixtureFallback, shouldUsePersonaFixturesOnly } from '../runtime-config'

export type SharePersonaResult = ChatSharePersona | { error: string; status: number }

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

async function fetchSharePersonaFromApi(
  personaId: string,
  projectId: string | null,
): Promise<SharePersonaResult | null> {
  const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
  const live = await fetchPersonaApi(`/personas/${personaId}/public${qs}`, { method: 'GET' })
  if (live.ok) {
    return mapPublicPersonaJson((live.json ?? {}) as Record<string, unknown>, personaId, projectId)
  }

  const detail = await fetchPersonaDetail(personaId)
  if (!detail.persona) return null

  const p = detail.persona
  if (projectId && p.projectId && p.projectId !== projectId) {
    return { error: 'Share token does not match persona project', status: 403 }
  }

  return {
    id: p.id,
    name: p.name,
    role: p.role,
    projectId: p.projectId,
    avatarUrl: p.avatarUrl,
    bio: p.bio ?? null,
  }
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
    const fromApi = await fetchSharePersonaFromApi(trimmedId, trimmedProject)
    if (fromApi && !('error' in fromApi)) return fromApi
    if (fromApi && 'error' in fromApi) return fromApi
    if (!allowPersonaFixtureFallback()) {
      return { error: 'Persona not found', status: 404 }
    }
  }

  return storeSharePersona(trimmedId, trimmedProject)
}
