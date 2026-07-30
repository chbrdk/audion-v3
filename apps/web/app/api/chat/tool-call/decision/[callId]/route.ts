import type { ChatToolDecisionPayload } from '@audion-v3/contracts'
import { storeChatToolDecisionStream } from '../../../../../../lib/fixtures/chat-share'
import { getChatApiBase, shouldPreferChatLive, shouldRequireChatLive } from '../../../../../../lib/runtime-config'
import { paths } from '../../../../../../lib/paths'

type Params = { params: Promise<{ callId: string }> }

function fixtureDecisionStream(callId: string, body: ChatToolDecisionPayload): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const event of storeChatToolDecisionStream(callId, body)) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: Request, { params }: Params) {
  const { callId } = await params
  const body = (await request.json()) as ChatToolDecisionPayload
  if (body?.decision !== 'approve' && body?.decision !== 'deny') {
    return Response.json({ error: 'decision must be approve or deny' }, { status: 400 })
  }

  if (shouldPreferChatLive()) {
    try {
      const base = getChatApiBase().replace(/\/$/, '')
      const authorization = request.headers.get('authorization')
      const headers = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      })
      if (authorization) headers.set('authorization', authorization)
      const upstream = await fetch(`${base}/chat/tool-call/decision/${encodeURIComponent(callId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ decision: body.decision }),
        cache: 'no-store',
      })
      if (upstream.ok) {
        // Map live JSON into a short NDJSON tool_complete / denied for the magazine UI.
        const json = (await upstream.json().catch(() => ({}))) as Record<string, unknown>
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            if (body.decision === 'deny') {
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({
                    type: 'tool_denied',
                    callId,
                    tool: 'inspect_website',
                    message: 'Inspection cancelled.',
                  })}\n`,
                ),
              )
            } else {
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({
                    type: 'tool_started',
                    callId,
                    tool: 'inspect_website',
                    message: 'Tool approved',
                  })}\n`,
                ),
              )
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({
                    type: 'tool_complete',
                    callId,
                    tool: 'inspect_website',
                    summary: String(json.summary ?? 'Inspection complete'),
                    convert: json.convert ?? null,
                  })}\n`,
                ),
              )
            }
            controller.close()
          },
        })
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        })
      }
      if (shouldRequireChatLive()) {
        return Response.json(
          { error: `Tool decision failed (${upstream.status})`, hint: `Set ${paths.envChatApiInternal}` },
          { status: upstream.status || 502 },
        )
      }
    } catch (error) {
      if (shouldRequireChatLive()) {
        return Response.json(
          {
            error: 'Chat API unavailable',
            detail: error instanceof Error ? error.message : 'unknown',
          },
          { status: 502 },
        )
      }
    }
  }

  return fixtureDecisionStream(callId, body)
}
