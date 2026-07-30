import { NextResponse } from 'next/server'
import type { ChatSendPayload } from '@audion-v3/contracts'
import { storeChatFakeStream } from '../../../../lib/fixtures/chat-store'
import { getChatApiBase, shouldUseChatFixtures } from '../../../../lib/runtime-config'

export async function POST(request: Request) {
  const body = (await request.json()) as ChatSendPayload
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (!body?.personaId?.trim()) {
    return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
  }

  if (shouldUseChatFixtures()) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        for (const event of storeChatFakeStream(body)) {
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

  try {
    const base = getChatApiBase()
    const upstream = await fetch(`${base}/chat/message/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify(body),
    })
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: text || `Chat API failed (${upstream.status})` },
        { status: upstream.status || 502 },
      )
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    // Auto-fallback to fixtures when chat-api is unreachable
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        for (const event of storeChatFakeStream(body)) {
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
}
