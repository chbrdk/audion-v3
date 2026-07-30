import { NextResponse } from 'next/server'
import { storeStartUxWave } from '../../../../../../../lib/fixtures/ux-study-store'
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
  const wave = storeStartUxWave(studyId, waveId)
  if (!wave) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    studyId,
    waveId,
    status: wave.status,
    started: wave.runs.map((r) => ({
      runKey: r.runKey,
      jobId: r.jobId,
      skipped: r.agentStatus === 'complete',
    })),
    wave,
  })
}
