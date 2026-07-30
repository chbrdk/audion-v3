import { NextResponse } from 'next/server'
import { storeSyncUxWave } from '../../../../../../../lib/fixtures/ux-study-store'
import {
  proxyUxStudiesRequest,
  shouldProxyUxStudiesToApi,
} from '../../../../../../../lib/ux-studies-proxy'

export async function POST(
  request: Request,
  context: { params: Promise<{ studyId: string; waveId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId, waveId } = await context.params
  const wave = storeSyncUxWave(studyId, waveId)
  if (!wave) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    studyId,
    waveId,
    status: wave.status,
    runs: wave.runs,
    wave,
  })
}
