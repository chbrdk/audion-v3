import { NextResponse } from 'next/server'
import type { UxStudyWritePayload } from '@audion-v3/contracts'
import { storePatchUxStudy, storeUxStudyDetail } from '../../../../lib/fixtures/ux-study-store'
import { proxyUxStudiesRequest, shouldProxyUxStudiesToApi } from '../../../../lib/ux-studies-proxy'

export async function GET(
  request: Request,
  context: { params: Promise<{ studyId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId } = await context.params
  const study = await storeUxStudyDetail(studyId)
  if (!study) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(study)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ studyId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId } = await context.params
  const body = (await request.json()) as Partial<UxStudyWritePayload>
  const study = await storePatchUxStudy(studyId, body)
  if (!study) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(study)
}
