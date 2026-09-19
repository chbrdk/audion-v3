import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { storeProjectDetail } from '../../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../../lib/project-access'
import { syncLocalMembersToPlexon } from '../../../../../lib/sync-collection-members'

/**
 * Push local members[] into Plexon assignments (additive; never overwrite).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  if (!viewerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { projectId } = await context.params
  const project = await storeProjectDetail(projectId)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, viewerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const result = await syncLocalMembersToPlexon({
    projectId,
    plexonUserId: viewerId,
  })
  return NextResponse.json(result)
}
