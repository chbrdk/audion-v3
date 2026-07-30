import { NextResponse } from 'next/server'
import type { GenerateJourneyPhaseMomentsRequest } from '@audion-v3/contracts'
import {
  runStubGenerateJourneyPhaseMoments,
  withAiLiveOrStub,
} from '../../../../../../../lib/ai-workflows'
import { runLiveGenerateJourneyPhaseMoments } from '../../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ journeyId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { journeyId } = await params
  const body = (await request.json().catch(() => ({}))) as GenerateJourneyPhaseMomentsRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveGenerateJourneyPhaseMoments(journeyId, body, authorization),
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
