/**
 * Same-origin reverse proxy for https://bey.chat/*
 * Spec: specs/domain/bey-video-chat.md § Embed proxy
 */

import { paths } from '../../../lib/paths'
import { proxyBeyUpstream } from '../../../lib/bey/embed-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ path?: string[] }> }

async function handle(request: Request, ctx: Ctx): Promise<Response> {
  const segments = (await ctx.params).path ?? []
  const last = segments[segments.length - 1] ?? ''
  const looksLikeAsset = /\.[a-z0-9]{1,8}$/i.test(last)
  const mode = looksLikeAsset ? (last.endsWith('.js') ? 'script' : 'none') : 'html'

  return proxyBeyUpstream({
    request,
    upstreamBase: paths.beyChatEmbedBase,
    pathSegments: segments,
    rewrite: mode,
  })
}

export const GET = handle
export const HEAD = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
