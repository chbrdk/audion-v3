import { NextResponse } from 'next/server'
import type { UxWaveWritePayload } from '@audion-v3/contracts'
import {
  storePatchUxWave,
  storeUxWaveDetail,
} from '../../../../../../lib/fixtures/ux-study-store'
import {
  proxyUxStudiesRequest,
  shouldProxyUxStudiesToApi,
} from '../../../../../../lib/ux-studies-proxy'

export async function GET(
  request: Request,
  context: { params: Promise<{ studyId: string; waveId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId, waveId } = await context.params
  const wave = await storeUxWaveDetail(studyId, waveId)
  if (!wave) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(wave)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ studyId: string; waveId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId, waveId } = await context.params
  const body = (await request.json()) as UxWaveWritePayload
  const wave = await storePatchUxWave(studyId, waveId, body)
  if (!wave) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(wave)
}
