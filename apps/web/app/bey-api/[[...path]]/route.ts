/**
 * Same-origin reverse proxy for https://api.bey.chat/*
 * Spec: specs/domain/bey-video-chat.md § Embed proxy
 */

import { paths } from '../../../lib/paths'
import { proxyBeyUpstream } from '../../../lib/bey/embed-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ path?: string[] }> }

async function handle(request: Request, ctx: Ctx): Promise<Response> {
  const segments = (await ctx.params).path ?? []
  return proxyBeyUpstream({
    request,
    upstreamBase: paths.beyChatApiBase,
    pathSegments: segments,
    rewrite: 'none',
  })
}

export const GET = handle
export const HEAD = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
