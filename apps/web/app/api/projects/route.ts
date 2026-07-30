import { NextResponse } from 'next/server'
import type { ProjectWritePayload } from '@audion-v3/contracts'
import { storeCreateProject } from '../../../lib/fixtures/project-store'

export async function POST(request: Request) {
  const body = (await request.json()) as ProjectWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const project = storeCreateProject(body)
  return NextResponse.json(project, { status: 201 })
}
