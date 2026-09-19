import { NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { revokeCollectionMemberOnPlexon } from '../../../../../../lib/collection-members-plexon'
import { storeProjectDetail } from '../../../../../../lib/fixtures/project-store'
import { isRealPlatformProjectId } from '../../../../../../lib/plexon-platform-id'
import { viewerCanAccessProject } from '../../../../../../lib/project-access'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; userId: string }> },
) {
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  if (!viewerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { projectId, userId } = await context.params
  const project = await storeProjectDetail(projectId)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, viewerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!isRealPlatformProjectId(project.platformProjectId)) {
    return NextResponse.json({ error: 'collection_required' }, { status: 400 })
  }

  const result = await revokeCollectionMemberOnPlexon({
    platformProjectId: project.platformProjectId!,
    plexonUserId: viewerId,
    memberUserId: userId,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
