import { NextResponse } from 'next/server'
import type { JourneyWritePayload } from '@audion-v3/contracts'
import {
  storeDeleteJourney,
  storeJourneyDetail,
  storePatchJourney,
} from '../../../../lib/fixtures/journey-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ journeyId: string }> },
) {
  const { journeyId } = await context.params
  const journey = await storeJourneyDetail(journeyId)
  if (!journey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(journey)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ journeyId: string }> },
) {
  const { journeyId } = await context.params
  const body = (await request.json()) as Partial<JourneyWritePayload>
  const journey = await storePatchJourney(journeyId, body)
  if (!journey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(journey)
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ journeyId: string }> },
) {
  const { journeyId } = await context.params
  const ok = storeDeleteJourney(journeyId)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
