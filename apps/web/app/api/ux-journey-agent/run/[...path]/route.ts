import { auth } from '../../../../../auth'
import { paths } from '../../../../../lib/paths'
import {
  isUxJourneyAgentConfigured,
  uxJourneyAgentProxy,
} from '../../../../../lib/ux-journey-agent-client'

type Params = { params: Promise<{ path?: string[] }> }

async function isAuthorizedForAgentProxy(request: Request): Promise<boolean> {
  const session = await auth()
  if (session?.user) return true
  const authorization = request.headers.get('authorization')
  if (!authorization?.toLowerCase().startsWith('bearer ')) return false
  const raw = authorization.trim().replace(/^Bearer\s+/i, '').trim()
  const envTok = process.env[paths.audionApiTokenEnvKey]?.trim()
  if (envTok && raw === envTok) return true
  try {
    const verifyUrl = new URL(paths.routes.apiSettingsTokenVerify, request.url)
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { authorization },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Authenticated BFF proxy to the V3 UX Journey Agent
 * (live frames, video, status) — keeps the agent secret server-side.
 * Accepts session cookie or AUDION API Bearer (machine/scripts).
 */
export async function GET(request: Request, { params }: Params) {
  if (!(await isAuthorizedForAgentProxy(request))) {
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
  if (!(await isAuthorizedForAgentProxy(request))) {
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
