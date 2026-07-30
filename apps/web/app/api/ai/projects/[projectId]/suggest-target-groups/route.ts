import { NextResponse } from 'next/server'
import type { SuggestTargetGroupsRequest } from '@audion-v3/contracts'
import { runStubSuggestTargetGroups, withAiLiveOrStub } from '../../../../../../lib/ai-workflows'
import { runLiveSuggestTargetGroups } from '../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestTargetGroupsRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveSuggestTargetGroups(projectId, body, authorization),
    () => runStubSuggestTargetGroups(projectId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
