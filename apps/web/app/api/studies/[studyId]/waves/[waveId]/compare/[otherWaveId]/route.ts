import { NextResponse } from 'next/server'
import { storeCompareUxWaves } from '../../../../../../../../lib/fixtures/ux-study-store'
import { proxyUxStudiesRequest, shouldProxyUxStudiesToApi } from '../../../../../../../../lib/ux-studies-proxy'

export async function GET(
  request: Request,
  context: { params: Promise<{ studyId: string; waveId: string; otherWaveId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId, waveId, otherWaveId } = await context.params
  const delta = await storeCompareUxWaves(studyId, waveId, otherWaveId)
  if (!delta) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(delta)
}
