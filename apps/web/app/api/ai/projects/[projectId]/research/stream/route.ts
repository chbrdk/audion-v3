import { storeResearchSseChunks, storeResearchStatus } from '../../../../../../../lib/fixtures/research-runs'
import {
  getPersonaBackendBase,
  shouldPreferAiLive,
  shouldRequireAiLive,
  shouldUsePersonaFixturesOnly,
} from '../../../../../../../lib/runtime-config'

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params
  const url = new URL(request.url)
  const runId = url.searchParams.get('run_id')
  const after = url.searchParams.get('after')
  if (!runId) {
    return new Response(JSON.stringify({ error: 'run_id query required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (shouldPreferAiLive() && !shouldUsePersonaFixturesOnly()) {
    const base = getPersonaBackendBase({ preferPublic: false }).replace(/\/$/, '')
    const qs = new URLSearchParams({ run_id: runId })
    if (after) qs.set('after', after)
    const authorization = request.headers.get('authorization')
    try {
      const upstream = await fetch(
        `${base}/projects/${projectId}/research/stream?${qs.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(authorization ? { authorization } : {}),
          },
          cache: 'no-store',
        },
      )
      if (upstream.ok && upstream.body) {
        return new Response(upstream.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      }
      if (shouldRequireAiLive()) {
        return new Response(JSON.stringify({ error: 'Upstream stream unavailable' }), {
          status: upstream.status || 502,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch {
      if (shouldRequireAiLive()) {
        return new Response(JSON.stringify({ error: 'Upstream stream unavailable' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }

  const status = storeResearchStatus(projectId, runId)
  if (!('events' in status)) {
    return new Response(JSON.stringify({ error: status.error }), {
      status: status.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let cursor = after
      for (let i = 0; i < 12; i++) {
        const chunks = storeResearchSseChunks(projectId, runId, cursor)
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
          if (chunk.includes('event: done')) {
            controller.close()
            return
          }
          const match = chunk.match(/"id":"([^"]+)"/)
          if (match?.[1]) cursor = match[1]
        }
        const current = storeResearchStatus(projectId, runId)
        if (
          'events' in current &&
          (current.status === 'succeeded' || current.status === 'failed')
        ) {
          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ runId, status: current.status })}\n\n`,
            ),
          )
          controller.close()
          return
        }
        await new Promise((r) => setTimeout(r, 700))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
