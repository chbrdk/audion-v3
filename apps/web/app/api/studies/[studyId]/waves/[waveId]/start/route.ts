import { NextResponse } from 'next/server'
import { startUxWaveNativeOrFixture } from '../../../../../../../lib/ux-studies-native'
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
  let force = false
  try {
    const body = (await request.json()) as { force?: boolean }
    force = Boolean(body?.force)
  } catch {
    force = false
  }
  const wave = await startUxWaveNativeOrFixture(studyId, waveId, { force })
  if (!wave) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    studyId,
    waveId,
    status: wave.status,
    forceApplied: force,
    started: wave.runs.map((r) => ({
      runKey: r.runKey,
      jobId: r.jobId,
      skipped: r.agentStatus === 'complete',
    })),
    wave,
  })
}
