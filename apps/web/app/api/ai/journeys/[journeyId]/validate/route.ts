import { NextResponse } from 'next/server'
import type { ValidateJourneyRequest } from '@audion-v3/contracts'
import { runStubValidateJourney, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeValidateJourney } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ journeyId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { journeyId } = await params
  const body = (await request.json().catch(() => ({}))) as ValidateJourneyRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeValidateJourney(journeyId, body, authorization),
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
