import type { ChatToolDecisionPayload } from '@audion-v3/contracts'
import {
  storeChatToolDecisionStream,
  storeConsumeToolProposal,
} from '../../../../../../lib/fixtures/chat-share'
import {
  canRunLiveInspect,
  runLiveInspectWebsiteStream,
} from '../../../../../../lib/chat/inspect-website-live'

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

  if (body.decision === 'approve' && canRunLiveInspect()) {
    const pending = storeConsumeToolProposal(callId)
    if (pending?.url) {
      const personaId = body.personaId || pending.personaId
      const projectId = body.projectId ?? pending.projectId
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            for await (const event of runLiveInspectWebsiteStream({
              callId,
              url: pending.url!,
              personaId,
              projectId,
              task: pending.detail || `Inspect ${pending.url}`,
            })) {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            }
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  type: 'error',
                  message: error instanceof Error ? error.message : 'inspect failed',
                })}\n`,
              ),
            )
          } finally {
            controller.close()
          }
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
  }

  return fixtureDecisionStream(callId, body)
}
