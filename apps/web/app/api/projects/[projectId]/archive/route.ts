import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { setCollectionLifecycleOnPlexon } from '../../../../../lib/archive-project-plexon'
import {
  storeArchiveProject,
  storeProjectDetail,
} from '../../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../../lib/project-access'

/**
 * Archive Collection globally via Plexon (when bound), then mark local mirror archived.
 * Prefer this over hard-delete — product mirrors must stay aligned.
 */
export async function POST(
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
  return NextResponse.json(archived)
}
