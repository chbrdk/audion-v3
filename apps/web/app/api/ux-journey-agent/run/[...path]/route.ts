import { auth } from '../../../../../auth'
import {
  isUxJourneyAgentConfigured,
  uxJourneyAgentProxy,
} from '../../../../../lib/ux-journey-agent-client'

type Params = { params: Promise<{ path?: string[] }> }

/**
 * Authenticated BFF proxy to the V3 UX Journey Agent
 * (live frames, video, status) — keeps the agent secret server-side.
 */
export async function GET(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isUxJourneyAgentConfigured()) {
    return Response.json({ error: 'UX_JOURNEY_AGENT_URL is not configured' }, { status: 503 })
  }
  const { path } = await params
  const suffix = (path ?? []).map(encodeURIComponent).join('/')
  const url = new URL(request.url)
  const qs = url.search || ''
  try {
    const upstream = await uxJourneyAgentProxy(`/run/${suffix}${qs}`, {
      method: 'GET',
      headers: {
        Accept: request.headers.get('accept') || '*/*',
      },
    })
    const headers = new Headers()
    const ct = upstream.headers.get('content-type')
    if (ct) headers.set('content-type', ct)
    headers.set('cache-control', 'no-store')
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch (error) {
    return Response.json(
      {
        error: 'UX journey agent unavailable',
        detail: error instanceof Error ? error.message : 'unknown',
      },
      { status: 502 },
    )
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isUxJourneyAgentConfigured()) {
    return Response.json({ error: 'UX_JOURNEY_AGENT_URL is not configured' }, { status: 503 })
  }
  const { path } = await params
  const suffix = (path ?? []).map(encodeURIComponent).join('/')
  const url = new URL(request.url)
  const qs = url.search || ''
  const body = await request.arrayBuffer()
  try {
    const upstream = await uxJourneyAgentProxy(`/run/${suffix}${qs}`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        Accept: request.headers.get('accept') || 'application/json',
      },
      body: body.byteLength ? body : undefined,
    })
    const headers = new Headers()
    const ct = upstream.headers.get('content-type')
    if (ct) headers.set('content-type', ct)
    headers.set('cache-control', 'no-store')
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch (error) {
    return Response.json(
      {
        error: 'UX journey agent unavailable',
        detail: error instanceof Error ? error.message : 'unknown',
      },
      { status: 502 },
    )
  }
}
