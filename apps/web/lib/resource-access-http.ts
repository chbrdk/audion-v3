/**
 * Access Model B gates for assistant / machine clients on AUDION resources.
 * Spec: plexon-v3/specs/domain/assistant-actor-identity.md
 */

import { NextResponse } from 'next/server'
import { getRequestUser } from './auth-api-token'
import { storeProjectDetail } from './fixtures/project-store'
import { storeTargetGroupDetail } from './fixtures/target-group-store'
import { viewerCanAccessProject } from './project-access'
import { isPlexonAuthConfigured } from './runtime-config'

export type ViewerOk = { ok: true; viewerId: string | null }
export type ViewerDenied = { ok: false; response: NextResponse }

/** When Plexon auth is on, require a resolved viewer (session / actor / personal token). */
export async function requireViewer(request: Request): Promise<ViewerOk | ViewerDenied> {
  if (!isPlexonAuthConfigured()) {
    return { ok: true, viewerId: null }
  }
  const viewer = await getRequestUser(request)
  if (!viewer?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, viewerId: viewer.id }
}

export async function requireProjectAccess(
  request: Request,
  projectId: string,
): Promise<ViewerOk | ViewerDenied> {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate
  if (!isPlexonAuthConfigured()) return gate

  const project = await storeProjectDetail(projectId)
  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'not_found' }, { status: 404 }),
    }
  }
  if (!(await viewerCanAccessProject(project, gate.viewerId))) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    }
  }
  return gate
}

export async function requireTargetGroupAccess(
  request: Request,
  targetGroupId: string,
): Promise<ViewerOk | ViewerDenied> {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate

  const tg = await storeTargetGroupDetail(targetGroupId)
  if (!tg) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'not_found' }, { status: 404 }),
    }
  }
  if (!isPlexonAuthConfigured()) return gate

  const projectId = tg.projectId?.trim()
  if (!projectId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    }
  }
  return requireProjectAccess(request, projectId)
}
