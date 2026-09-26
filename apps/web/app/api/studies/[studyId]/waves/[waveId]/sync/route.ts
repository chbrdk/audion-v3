import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../../../../lib/auth-api-token'
import { syncUxWaveNativeOrFixture } from '../../../../../../../lib/ux-studies-native'
import {
  proxyUxStudiesRequest,
  shouldProxyUxStudiesToApi,
} from '../../../../../../../lib/ux-studies-proxy'
import { runWithUsageUserId } from '../../../../../../../lib/usage-report'

export async function POST(
  request: Request,
  context: { params: Promise<{ studyId: string; waveId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId, waveId } = await context.params
  const viewer = await getRequestUser(request)
  const wave = await runWithUsageUserId(viewer?.id ?? null, () =>
    syncUxWaveNativeOrFixture(studyId, waveId),
  )
  if (!wave) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    studyId,
    waveId,
    status: wave.status,
    runs: wave.runs,
    wave,
  })
}
