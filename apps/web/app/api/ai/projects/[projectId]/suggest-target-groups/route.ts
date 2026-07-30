import { NextResponse } from 'next/server'
import type { SuggestTargetGroupsRequest } from '@audion-v3/contracts'
import { runStubSuggestTargetGroups, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeSuggestTargetGroups } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestTargetGroupsRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeSuggestTargetGroups(projectId, body, authorization),
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
