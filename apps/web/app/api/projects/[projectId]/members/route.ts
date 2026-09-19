import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import {
  addCollectionMemberOnPlexon,
  fetchCollectionMembersFromPlexon,
} from '../../../../../lib/collection-members-plexon'
import { storeProjectDetail } from '../../../../../lib/fixtures/project-store'
import { isRealPlatformProjectId } from '../../../../../lib/plexon-platform-id'
import { viewerCanAccessProject } from '../../../../../lib/project-access'
import { mergeTeamDisplay } from '../../../../../lib/sync-collection-members'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export async function GET(
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

  if (!isRealPlatformProjectId(project.platformProjectId) || !isPlexonAuthConfigured()) {
    return NextResponse.json({
      items: mergeTeamDisplay({ plexonMembers: null, localMembers: project.members }),
      source: 'local',
    })
  }

  const remote = await fetchCollectionMembersFromPlexon({
    platformProjectId: project.platformProjectId!,
    plexonUserId: viewerId,
  })
  if (!remote.ok) {
    return NextResponse.json({
      items: mergeTeamDisplay({ plexonMembers: null, localMembers: project.members }),
      source: 'local_fallback',
      detail: remote.error,
    })
  }

  return NextResponse.json({
    items: mergeTeamDisplay({
      plexonMembers: remote.items,
      localMembers: project.members,
    }),
    source: 'plexon',
  })
}

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

  let body: { email?: unknown; role?: unknown } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  const role = body.role === 'admin' ? 'admin' : 'member'

  const result = await addCollectionMemberOnPlexon({
    platformProjectId: project.platformProjectId!,
    plexonUserId: viewerId,
    email,
    role,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
