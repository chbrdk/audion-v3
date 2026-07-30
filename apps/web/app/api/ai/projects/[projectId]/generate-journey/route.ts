import { NextResponse } from 'next/server'
import type { GenerateJourneyRequest } from '@audion-v3/contracts'
import { runStubGenerateJourney, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeGenerateJourney } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as GenerateJourneyRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeGenerateJourney(body, projectId, authorization),
    () => runStubGenerateJourney(body, projectId),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data, { status: 201 })
}
