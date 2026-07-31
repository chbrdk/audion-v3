import { NextResponse } from 'next/server'
import type { ProjectWritePayload } from '@audion-v3/contracts'
import { storePatchProject } from '../../../../lib/fixtures/project-store'

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
