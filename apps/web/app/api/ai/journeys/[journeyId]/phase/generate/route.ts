import { NextResponse } from 'next/server'
import type { GenerateJourneyPhaseMomentsRequest } from '@audion-v3/contracts'
import {
  runStubGenerateJourneyPhaseMoments,
  withAiNativeOrStub,
} from '../../../../../../../lib/ai-workflows'
import { runNativeGenerateJourneyPhaseMoments } from '../../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ journeyId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { journeyId } = await params
  const body = (await request.json().catch(() => ({}))) as GenerateJourneyPhaseMomentsRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeGenerateJourneyPhaseMoments(journeyId, body, authorization),
    () => runStubGenerateJourneyPhaseMoments(journeyId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
