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

/** Filter resources whose parent project the viewer can access. */
export async function filterByParentProjectForViewer<T extends { projectId?: string | null }>(
  resources: T[],
  viewerId: string | null,
): Promise<T[]> {
  if (!isPlexonAuthConfigured()) return resources
  if (!viewerId) return []
  const projectIds = [
    ...new Set(resources.map((p) => p.projectId?.trim()).filter(Boolean) as string[]),
  ]
  const { storeProjectDetail } = await import('./fixtures/project-store')
  const allowed = new Set<string>()
  await Promise.all(
    projectIds.map(async (id) => {
      const project = await storeProjectDetail(id)
      if (project && (await viewerCanAccessProject(project, viewerId))) {
        allowed.add(id)
      }
    }),
  )
  return resources.filter((p) => {
    const pid = p.projectId?.trim()
    return Boolean(pid && allowed.has(pid))
  })
}

/** @deprecated Prefer filterByParentProjectForViewer — same behavior. */
export const filterPersonasForViewer = filterByParentProjectForViewer

/** @deprecated Prefer filterByParentProjectForViewer — same behavior. */
export const filterJourneysForViewer = filterByParentProjectForViewer

/** SSR / helper: can the viewer open a project-scoped resource? */
export async function viewerCanAccessParentProject(
  resource: { projectId?: string | null },
  viewerId: string | null,
): Promise<boolean> {
  if (!isPlexonAuthConfigured()) return true
  if (!viewerId) return false
  const projectId = resource.projectId?.trim()
  if (!projectId) return false
  const { storeProjectDetail } = await import('./fixtures/project-store')
  const project = await storeProjectDetail(projectId)
  if (!project) return false
  return viewerCanAccessProject(project, viewerId)
}

/** @deprecated Prefer viewerCanAccessParentProject. */
export const viewerCanAccessPersona = viewerCanAccessParentProject
