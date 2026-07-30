import { NextResponse } from 'next/server'
import { storeJourneyDetail } from '../../../../../../../lib/fixtures/journey-store'
import { storeGetValidationReport } from '../../../../../../../lib/fixtures/journey-validation-store'

type Params = { params: Promise<{ journeyId: string; reportId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { journeyId, reportId } = await params
  if (!storeJourneyDetail(journeyId)) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 404 })
  }
  const report = storeGetValidationReport(journeyId, reportId)
  if (!report) {
    return NextResponse.json({ error: 'Validation report not found' }, { status: 404 })
  }
  return NextResponse.json(report)
}
