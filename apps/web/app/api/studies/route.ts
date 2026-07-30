import { NextResponse } from 'next/server'
import type { UxStudyWritePayload } from '@audion-v3/contracts'
import { storeCreateUxStudy, storeUxStudyList } from '../../../lib/fixtures/ux-study-store'
import { proxyUxStudiesRequest, shouldProxyUxStudiesToApi } from '../../../lib/ux-studies-proxy'

export async function GET(request: Request) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  return NextResponse.json(storeUxStudyList())
}

export async function POST(request: Request) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const body = (await request.json()) as UxStudyWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const study = storeCreateUxStudy(body)
  return NextResponse.json(study, { status: 201 })
}
