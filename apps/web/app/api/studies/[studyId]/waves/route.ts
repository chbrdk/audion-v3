import { NextResponse } from 'next/server'
import type { UxWaveWritePayload } from '@audion-v3/contracts'
import { storeCreateUxWave, storeUxStudyDetail } from '../../../../../lib/fixtures/ux-study-store'
import { proxyUxStudiesRequest, shouldProxyUxStudiesToApi } from '../../../../../lib/ux-studies-proxy'

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
  return NextResponse.json({ items: study.waves, total: study.waves.length })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ studyId: string }> },
) {
  if (shouldProxyUxStudiesToApi()) {
    return proxyUxStudiesRequest(request)
  }
  const { studyId } = await context.params
  const body = (await request.json()) as UxWaveWritePayload
  if (!body?.waveKey?.trim()) {
    return NextResponse.json({ error: 'waveKey is required' }, { status: 400 })
  }
  const wave = await storeCreateUxWave(studyId, body)
  if (!wave) return NextResponse.json({ error: 'Study not found' }, { status: 404 })
  return NextResponse.json(wave, { status: 201 })
}
