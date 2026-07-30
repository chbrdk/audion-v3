import { NextResponse } from 'next/server'
import type { ValidateJourneyRequest } from '@audion-v3/contracts'
import { runStubValidateJourney, withAiLiveOrStub } from '../../../../../../lib/ai-workflows'
import { runLiveValidateJourney } from '../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ journeyId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { journeyId } = await params
  const body = (await request.json().catch(() => ({}))) as ValidateJourneyRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveValidateJourney(journeyId, body, authorization),
    () => runStubValidateJourney(journeyId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
