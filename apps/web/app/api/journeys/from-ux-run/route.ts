import { NextResponse } from 'next/server'
import type { JourneyFromUxRunRequest } from '@audion-v3/contracts'
import { convertUxRunToJourney } from '../../../../lib/journey-from-ux-run'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as JourneyFromUxRunRequest
  const resolved = await convertUxRunToJourney(request, body)
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data, { status: resolved.data.alreadyConverted ? 200 : 201 })
}
