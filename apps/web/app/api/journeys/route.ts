import { NextResponse } from 'next/server'
import type { JourneyWritePayload } from '@audion-v3/contracts'
import { storeCreateJourney } from '../../../lib/fixtures/journey-store'
import { requireProjectAccess, requireViewer } from '../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'

export async function POST(request: Request) {
  const body = (await request.json()) as JourneyWritePayload & { project_id?: string }
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // MCP / FastAPI-era: project_id; contracts: projectId (parity with personas/target-groups).
  const projectId =
    (typeof body.projectId === 'string' ? body.projectId.trim() : '') ||
    (typeof body.project_id === 'string' ? body.project_id.trim() : '')
  if (isPlexonAuthConfigured()) {
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  } else {
    const gate = await requireViewer(request)
    if (!gate.ok) return gate.response
  }

  const journey = await storeCreateJourney({
    ...body,
    projectId: projectId || body.projectId || null,
    journeyType: body.journeyType?.trim() || 'journey',
  })
  return NextResponse.json(journey, { status: 201 })
}
