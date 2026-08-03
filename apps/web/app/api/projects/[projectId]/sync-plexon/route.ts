import { NextResponse } from 'next/server'
import { syncProjectToPlexon } from '../../../../../lib/sync-project-plexon'

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params
  let body: {
    ownerPlexonUserId?: string
    platformCompanyId?: string
    domain?: string
  } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }

  const result = await syncProjectToPlexon(projectId, body)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: result.status },
    )
  }
  return NextResponse.json(result)
}
