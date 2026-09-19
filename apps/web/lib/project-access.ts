/**
 * Access model B: capability project lists for a Plexon user.
 * Prefer live Plexon accessible-collections (paged); fall back to local ownerPlexonUserId.
 */

import { auth } from '../auth'
import { getPlexonContractHeaders } from './plexon-contract'
import { paths } from './paths'
import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'

export type ProjectAccessFields = {
  platformProjectId?: string | null
  ownerPlexonUserId?: string | null
}

const ACCESSIBLE_COLLECTIONS_MAX_PAGES = 40

export async function resolveViewerId(
  explicit?: string | null,
  request?: Request | null,
): Promise<string | null> {
  if (explicit?.trim()) return explicit.trim()
  if (request) {
    const { getRequestUser } = await import('./auth-api-token')
    const fromReq = await getRequestUser(request)
    if (fromReq?.id) return fromReq.id
  }
  const session = await auth()
  return session?.user?.id?.trim() || null
}

/**
 * Fetch Collection ids the user may see from Plexon.
 * Pages through `nextCursor` so visibility is not truncated at 50.
 */
export async function fetchAccessiblePlatformProjectIds(
  plexonUserId: string,
): Promise<Set<string> | null> {
  if (!isPlexonAuthConfigured()) return null
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const secret = getPlexonServiceSecret()
  const ids = new Set<string>()
  let cursor: string | null = null
  let pages = 0

  try {
    do {
      pages += 1
      const url = new URL(`${base}${paths.plexonAccessibleCollectionsPath}`)
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Plexon-User-Id': plexonUserId,
          ...getPlexonContractHeaders(secret),
        },
        cache: 'no-store',
      })
      if (!res.ok) return null
      const data = (await res.json()) as {
        items?: Array<{ id?: string }>
        nextCursor?: string | null
        truncated?: boolean
      }
      for (const item of data.items ?? []) {
        if (typeof item.id === 'string' && item.id.trim()) ids.add(item.id.trim())
      }
      const next = data.nextCursor?.trim() || null
      if (data.truncated && next) {
        cursor = next
      } else {
        cursor = null
      }
      if (pages >= ACCESSIBLE_COLLECTIONS_MAX_PAGES && cursor) {
        break
      }
    } while (cursor)

    return ids
  } catch {
    return null
  }
}

export function projectVisibleToOwner(
  project: ProjectAccessFields,
  viewerId: string,
): boolean {
  return Boolean(project.ownerPlexonUserId && project.ownerPlexonUserId === viewerId)
}

export async function filterProjectsForViewer<T extends ProjectAccessFields>(
  projects: T[],
  viewerId: string | null,
): Promise<T[]> {
  if (!viewerId) return []
  const accessible = await fetchAccessiblePlatformProjectIds(viewerId)
  if (accessible) {
    return projects.filter(
      (p) =>
        (p.platformProjectId && accessible.has(p.platformProjectId)) ||
        projectVisibleToOwner(p, viewerId),
    )
  }
  return projects.filter((p) => projectVisibleToOwner(p, viewerId))
}

export async function viewerCanAccessProject(
  project: ProjectAccessFields,
  viewerId: string | null,
): Promise<boolean> {
  if (!viewerId) return false
  if (projectVisibleToOwner(project, viewerId)) return true
  if (!project.platformProjectId) return false
  const accessible = await fetchAccessiblePlatformProjectIds(viewerId)
  if (!accessible) return false
  return accessible.has(project.platformProjectId)
}
