import { NextResponse } from 'next/server'
import type { TargetGroupWritePayload } from '@audion-v3/contracts'
import { storeCreateTargetGroup, storeTargetGroupList } from '../../../lib/fixtures/target-group-store'
import { storeProjectDetail } from '../../../lib/fixtures/project-store'
import { requireProjectAccess, requireViewer } from '../../../lib/resource-access-http'
import { filterProjectsForViewer } from '../../../lib/project-access'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'

/**
 * List target groups (assistant RAG / MCP).
 * Query: `project_id` or `projectId` — required when Plexon auth is on.
 */
export async function GET(request: Request) {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate.response

  const url = new URL(request.url)
  const projectId =
    url.searchParams.get('project_id')?.trim() ||
    url.searchParams.get('projectId')?.trim() ||
    ''

  if (isPlexonAuthConfigured()) {
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_required' }, { status: 400 })
    }
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  }

  const list = await storeTargetGroupList()
  let items = list.items
  if (projectId) {
    items = items.filter((g) => g.projectId === projectId)
  } else if (isPlexonAuthConfigured() && gate.viewerId) {
    const projects = await Promise.all(
      [...new Set(items.map((g) => g.projectId).filter(Boolean) as string[])].map((id) =>
        storeProjectDetail(id),
      ),
    )
    const visible = await filterProjectsForViewer(
      projects.filter(Boolean).map((p) => p!),
      gate.viewerId,
    )
    const allowed = new Set(visible.map((p) => p.id))
    items = items.filter((g) => g.projectId && allowed.has(g.projectId))
  }

  return NextResponse.json({
    items,
    total: items.length,
    page: 1,
    pageSize: items.length || 50,
  })
}

export async function POST(request: Request) {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate.response

  const body = (await request.json()) as TargetGroupWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
  if (isPlexonAuthConfigured()) {
    if (!projectId) {
      return NextResponse.json({ error: 'project_id_required' }, { status: 400 })
    }
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  }

  const targetGroup = await storeCreateTargetGroup({
    ...body,
    projectId: projectId || body.projectId,
    segment: body.segment?.trim() || 'Segment',
  })
  return NextResponse.json(targetGroup, { status: 201 })
}
