import { NextResponse } from 'next/server'
import type { GenerateJourneyRequest } from '@audion-v3/contracts'
import { runStubGenerateJourney, withAiLiveOrStub } from '../../../../../lib/ai-workflows'
import { runLiveGenerateJourney } from '../../../../../lib/ai-workflows-live'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GenerateJourneyRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveGenerateJourney(body, undefined, authorization),
    () => runStubGenerateJourney(body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data, { status: 201 })
}
