import { NextResponse } from 'next/server'
import type { ChatSendPayload } from '@audion-v3/contracts'
import { auth } from '../../../../auth'
import { nativeChatNdjsonResponse } from '../../../../lib/chat/native-stream'
import { storeChatFakeStream } from '../../../../lib/fixtures/chat-store'
import {
  shouldPreferChatLive,
  shouldRequireChatLive,
  shouldUseChatFixtures,
} from '../../../../lib/runtime-config'
import { paths } from '../../../../lib/paths'
import { reportUsage } from '../../../../lib/usage-report'

function fixtureStream(body: ChatSendPayload): Response {
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

export async function POST(request: Request) {
  const body = (await request.json()) as ChatSendPayload
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (!body?.personaId?.trim()) {
    return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
  }

  const session = await auth()
  if (session?.user?.id) {
    reportUsage({
      userId: session.user.id,
      eventType: 'chat.message.stream',
      rawUnits: {
        persona_id: body.personaId,
        message_chars: body.message.trim().length,
      },
    })
  }

  if (shouldUseChatFixtures() || !shouldPreferChatLive()) {
    return fixtureStream(body)
  }

  try {
    return nativeChatNdjsonResponse(body)
  } catch (error) {
    if (shouldRequireChatLive()) {
      return NextResponse.json(
        {
          error: 'Native chat unavailable',
          detail: error instanceof Error ? error.message : 'unknown',
          hint: `Set ${paths.envOpenAiApiKey} and ${paths.envAiRuntime}=auto|native`,
        },
        { status: 502 },
      )
    }
    return fixtureStream(body)
  }
}
