import { NextResponse } from 'next/server'
import type { JourneyWritePayload } from '@audion-v3/contracts'
import { storeCreateJourney } from '../../../lib/fixtures/journey-store'

export async function POST(request: Request) {
  const body = (await request.json()) as JourneyWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const journey = await storeCreateJourney({
    ...body,
    journeyType: body.journeyType?.trim() || 'journey',
  })
  return NextResponse.json(journey, { status: 201 })
}
