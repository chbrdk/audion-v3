/**
 * Same-origin reverse proxy for Firebase Auth / Installations used by bey.chat SPA.
 * Spec: specs/domain/bey-video-chat.md § Embed proxy
 */

import { proxyBeyGapiUpstream } from '../../../lib/bey/embed-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ path?: string[] }> }

async function handle(request: Request, ctx: Ctx): Promise<Response> {
  const segments = (await ctx.params).path ?? []
  return proxyBeyGapiUpstream({ request, pathSegments: segments })
}

export const GET = handle
export const HEAD = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
