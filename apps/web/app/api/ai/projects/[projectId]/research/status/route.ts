import { NextResponse } from 'next/server'
import { storeResearchStatus } from '../../../../../../../lib/fixtures/research-runs'
import { fetchPersonaApi, shouldPreferAiLive, shouldRequireAiLive } from '../../../../../../../lib/persona-api-proxy'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params
  const runId = new URL(request.url).searchParams.get('run_id')
  if (!runId) {
    return NextResponse.json({ error: 'run_id query required' }, { status: 400 })
  }

  if (shouldPreferAiLive()) {
    const authorization = request.headers.get('authorization')
    const live = await fetchPersonaApi(
      `/projects/${projectId}/research/status?run_id=${encodeURIComponent(runId)}`,
      { method: 'GET', authorization },
    )
    if (live.ok) {
      const json = (live.json ?? {}) as Record<string, unknown>
      return NextResponse.json({
        stubbed: false,
        projectId,
        runId,
        status: json.status ?? 'running',
        events: Array.isArray(json.events) ? json.events : [],
        error: json.error ?? null,
      })
    }
    if (shouldRequireAiLive()) {
      return NextResponse.json(
        { error: live.error, detail: live.detail },
        { status: live.status },
      )
    }
  }

  const result = storeResearchStatus(projectId, runId)
  if (!('events' in result)) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
