import { NextResponse } from 'next/server'
import { storeResearchLatest } from '../../../../../../../lib/fixtures/research-runs'
import { fetchPersonaApi, shouldPreferAiLive, shouldRequireAiLive } from '../../../../../../../lib/persona-api-proxy'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params

  if (shouldPreferAiLive()) {
    const authorization = request.headers.get('authorization')
    const live = await fetchPersonaApi(`/projects/${projectId}/research/latest`, {
      method: 'GET',
      authorization,
    })
    if (live.ok) {
      const json = (live.json ?? {}) as Record<string, unknown>
      return NextResponse.json({
        stubbed: false,
        projectId,
        runId: json.run_id ?? json.runId ?? null,
        status: json.status ?? 'succeeded',
        summaryEn: json.summary_en ?? json.summaryEn ?? null,
        raw: json,
      })
    }
    if (live.status === 404) {
      return NextResponse.json({
        stubbed: false,
        projectId,
        runId: null,
        status: 'missing',
        summaryEn: null,
        raw: null,
      })
    }
    if (shouldRequireAiLive()) {
      return NextResponse.json(
        { error: live.error, detail: live.detail },
        { status: live.status },
      )
    }
  }

  return NextResponse.json(storeResearchLatest(projectId))
}
