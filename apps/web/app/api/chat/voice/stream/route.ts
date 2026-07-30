import { NextResponse } from 'next/server'
import { shouldPreferChatLive, shouldRequireChatLive, getChatApiBase } from '../../../../../lib/runtime-config'
import { paths } from '../../../../../lib/paths'

/** Thin voice stream proxy / stub — full Whisper UI deferred. */
export async function POST(request: Request) {
  if (shouldPreferChatLive()) {
    try {
      const base = getChatApiBase().replace(/\/$/, '')
      const authorization = request.headers.get('authorization')
      const headers = new Headers({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      })
      if (authorization) headers.set('authorization', authorization)
      const body = await request.text()
      const upstream = await fetch(`${base}/voice/chat/stream`, {
        method: 'POST',
        headers,
        body,
        cache: 'no-store',
      })
      if (upstream.ok && upstream.body) {
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream',
            'Cache-Control': 'no-store',
          },
        })
      }
      if (shouldRequireChatLive()) {
        return NextResponse.json(
          { error: `Voice stream failed (${upstream.status})`, hint: `Set ${paths.envChatApiInternal}` },
          { status: upstream.status || 502 },
        )
      }
    } catch (error) {
      if (shouldRequireChatLive()) {
        return NextResponse.json(
          {
            error: 'Voice API unavailable',
            detail: error instanceof Error ? error.message : 'unknown',
          },
          { status: 502 },
        )
      }
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `${JSON.stringify({ type: 'delta', text: 'Voice mode stub — mic UI deferred. Switch to Text to continue.' })}\n`,
        ),
      )
      controller.enqueue(
        encoder.encode(
          `${JSON.stringify({ type: 'done', conversationId: 'voice-stub', messageId: 'voice-stub-1' })}\n`,
        ),
      )
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
