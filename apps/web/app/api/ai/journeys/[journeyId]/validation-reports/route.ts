import { NextResponse } from 'next/server'
import { storeJourneyDetail } from '../../../../../../lib/fixtures/journey-store'
import { storeListValidationReports } from '../../../../../../lib/fixtures/journey-validation-store'

type Params = { params: Promise<{ journeyId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { journeyId } = await params
  if (!await storeJourneyDetail(journeyId)) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 404 })
  }
  return NextResponse.json(storeListValidationReports(journeyId))
}
