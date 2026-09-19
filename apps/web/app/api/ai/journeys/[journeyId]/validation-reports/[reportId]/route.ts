import { NextResponse } from 'next/server'
import { storeJourneyDetail } from '../../../../../../../lib/fixtures/journey-store'
import { storeGetValidationReport } from '../../../../../../../lib/fixtures/journey-validation-store'
import { requireJourneyAccess } from '../../../../../../../lib/resource-access-http'

type Params = { params: Promise<{ journeyId: string; reportId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { journeyId, reportId } = await params
  const access = await requireJourneyAccess(request, journeyId)
  if (!access.ok) return access.response
  if (!(await storeJourneyDetail(journeyId))) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 404 })
  }
  const report = storeGetValidationReport(journeyId, reportId)
  if (!report) {
    return NextResponse.json({ error: 'Validation report not found' }, { status: 404 })
  }
  return NextResponse.json(report)
}
