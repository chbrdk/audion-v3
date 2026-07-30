import { NextResponse } from 'next/server'
import type { GenerateJourneyRequest } from '@audion-v3/contracts'
import { runStubGenerateJourney } from '../../../../../lib/ai-workflows'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GenerateJourneyRequest
  const result = runStubGenerateJourney(body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result, { status: 201 })
}
