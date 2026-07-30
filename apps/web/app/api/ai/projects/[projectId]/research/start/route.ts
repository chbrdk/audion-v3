import { NextResponse } from 'next/server'
import type { ResearchStartRequest } from '@audion-v3/contracts'
import { runStubResearchStart, withAiNativeOrStub } from '../../../../../../../lib/ai-workflows'
import { runNativeResearchStart } from '../../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as ResearchStartRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeResearchStart(projectId, body, authorization),
    () => runStubResearchStart(projectId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
