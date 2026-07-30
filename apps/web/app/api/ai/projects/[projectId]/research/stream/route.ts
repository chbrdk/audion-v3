import { storeResearchSseChunks, storeResearchStatus } from '../../../../../../../lib/fixtures/research-runs'

type Params = { params: Promise<{ projectId: string }> }

/**
 * Research SSE — fixture/native in-process runs only (no V2 upstream).
 * Native jobs update the same store via research-native.ts.
 */
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
