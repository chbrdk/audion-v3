import { NextResponse } from 'next/server'
import type { SuggestTargetGroupsRequest } from '@audion-v3/contracts'
import { runStubSuggestTargetGroups } from '../../../../../../lib/ai-workflows'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestTargetGroupsRequest
  const result = runStubSuggestTargetGroups(projectId, body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
