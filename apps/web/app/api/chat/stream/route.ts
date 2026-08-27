import { NextResponse } from 'next/server'
import type { ChatSendPayload } from '@audion-v3/contracts'
import { auth } from '../../../../auth'
import {
  checkGuestBudget,
  consumeGuestTurn,
  createGuestSessionId,
  GUEST_CHAT_COOKIE,
  GUEST_CHAT_TTL_MS,
  getGuestBudgetState,
  guestBudgetKey,
  remainingGuestTurns,
} from '../../../../lib/chat/guest-budget'
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
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const event of storeChatFakeStream(body)) {
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

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie')
  if (!raw) return null
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('=').trim())
  }
  return null
}

function resolveGuestSessionId(request: Request, body: ChatSendPayload): string {
  const fromBody = body.guestSessionId?.trim()
  if (fromBody) return fromBody
  const fromCookie = readCookie(request, GUEST_CHAT_COOKIE)?.trim()
  if (fromCookie) return fromCookie
  return createGuestSessionId()
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatSendPayload
  const imageIds = (body.imageIds ?? []).map((id) => id.trim()).filter(Boolean)
  const documentIds = (body.documentIds ?? []).map((id) => id.trim()).filter(Boolean)
  if (!body?.message?.trim() && imageIds.length === 0 && documentIds.length === 0) {
    return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 })
  }
  if (!body?.personaId?.trim()) {
    return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
  }

  const session = await auth()
  const isGuest = !session?.user?.id

  if (isGuest && (imageIds.length > 0 || documentIds.length > 0 || body.abCompare)) {
    return NextResponse.json(
      {
        error: 'Attachments are not available in guest chat',
        code: 'GUEST_ATTACHMENTS_DENIED',
      },
      { status: 403 },
    )
  }

  if (session?.user?.id) {
    reportUsage({
      userId: session.user.id,
      eventType: 'chat.message.stream',
      rawUnits: {
        persona_id: body.personaId,
        message_chars: body.message.trim().length,
        image_count: imageIds.length,
        document_count: documentIds.length,
      },
    })
  }

  let guestSessionId: string | null = null
  if (isGuest) {
    const projectId = body.projectId?.trim() || ''
    if (!projectId) {
      return NextResponse.json(
        {
          error: 'projectId is required for guest chat',
          code: 'GUEST_PROJECT_REQUIRED',
        },
        { status: 400 },
      )
    }
    guestSessionId = resolveGuestSessionId(request, body)
    const key = guestBudgetKey(guestSessionId, body.personaId, projectId)
    const state = getGuestBudgetState(key)
    const check = checkGuestBudget({ state, message: body.message })
    if (!check.ok) {
      return NextResponse.json(
        { error: check.message, code: check.code, remaining: check.remaining },
        { status: check.status },
      )
    }
    const next = consumeGuestTurn(key)
    const remaining = remainingGuestTurns(next)

    let response: Response
    if (shouldUseChatFixtures() || !shouldPreferChatLive()) {
      response = fixtureStream(body)
    } else {
      try {
        response = nativeChatNdjsonResponse(body)
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
        response = fixtureStream(body)
      }
    }

    const headers = new Headers(response.headers)
    headers.set('X-Audion-Guest-Remaining', String(remaining))
    headers.append(
      'Set-Cookie',
      `${GUEST_CHAT_COOKIE}=${encodeURIComponent(guestSessionId)}; Path=/; Max-Age=${Math.floor(
        GUEST_CHAT_TTL_MS / 1000,
      )}; SameSite=None; Secure`,
    )
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
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
