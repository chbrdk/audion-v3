import { NextResponse } from 'next/server'
import type { ProjectWritePayload } from '@audion-v3/contracts'
import { auth } from '../../../../auth'
import { setCollectionLifecycleOnPlexon } from '../../../../lib/archive-project-plexon'
import {
  storeArchiveProject,
  storePatchProject,
  storeProjectDetail,
} from '../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../lib/project-access'

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params
  const project = await storeProjectDetail(projectId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params
  const body = (await request.json()) as Partial<ProjectWritePayload>
  const project = await storePatchProject(projectId, body)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

/**
 * @deprecated Prefer POST /api/projects/:projectId/archive — DELETE archives (no hard-delete).
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  if (!viewerId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const project = await storeProjectDetail(projectId)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, viewerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const remote = await setCollectionLifecycleOnPlexon({
    platformProjectId: project.platformProjectId,
    plexonUserId: viewerId,
    status: 'archived',
  })
  if (!remote.ok) {
    return NextResponse.json(
      { error: 'plexon_archive_failed', detail: remote.detail },
      { status: remote.status >= 400 && remote.status < 600 ? remote.status : 502 },
    )
  }

  const archived = await storeArchiveProject(projectId)
  if (!archived) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
