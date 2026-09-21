import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { createCollectionInviteOnPlexon } from '../../../../../lib/collection-members-plexon'
import { storeProjectDetail } from '../../../../../lib/fixtures/project-store'
import { isRealPlatformProjectId } from '../../../../../lib/plexon-platform-id'
import { viewerCanAccessProject } from '../../../../../lib/project-access'

export async function POST(
  request: Request,
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
  if (!isRealPlatformProjectId(project.platformProjectId)) {
    return NextResponse.json({ error: 'collection_required' }, { status: 400 })
  }

  let body: { role?: unknown; toEmail?: unknown } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  const role = body.role === 'admin' ? 'admin' : 'member'

  const toEmail =
    typeof body.toEmail === 'string' && body.toEmail.trim() ? body.toEmail.trim() : undefined

  const result = await createCollectionInviteOnPlexon({
    platformProjectId: project.platformProjectId!,
    plexonUserId: viewerId,
    role,
    ...(toEmail ? { toEmail } : {}),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
