/**
 * Native chat NDJSON stream — OpenAI completions → V3 ChatStreamEvent.
 */

import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts'
import { createOpenAiClient, getAiOpenAiModel, toAiNativeError } from '../ai/client'
import {
  storeChatAppendAssistant,
  storeChatBeginUserTurn,
  storeChatConversationDetail,
} from '../fixtures/chat-store'
import { maybeProposeInspectWebsite } from '../fixtures/chat-share'
import { abCompareSystemInstruction, shouldEnableAbCompare } from './ab-compare'
import { resolveChatImages } from './image-upload-store'
import { extractUrlFromMessage } from './share'
import { resolvePersonaSystemPrompt } from '../fixtures/persona-prompts-store'

const HISTORY_MESSAGE_LIMIT = 12

type OpenAiTextPart = { type: 'text'; text: string }
type OpenAiImagePart = { type: 'image_url'; image_url: { url: string } }
type OpenAiContent = string | Array<OpenAiTextPart | OpenAiImagePart>

type OpenAiChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: OpenAiContent
}

async function systemPromptForPersona(
  personaId: string,
  message: string,
  abCompare: boolean,
): Promise<string> {
  let base = await resolvePersonaSystemPrompt(personaId)
  if (abCompare) {
    base = `${base}\n\n${abCompareSystemInstruction()}`
  }
  const url = extractUrlFromMessage(message)
  if (!url) return base
  return `${base}

AUDION TOOLING:
The user mentioned ${url}. A real browser inspect tool (inspect_website) will be offered after your reply.
Do not say you cannot open or fetch websites. Keep your answer short: acknowledge the URL and that they can Approve the inspect card to walk the site as you.`
}

function userContentWithImages(
  text: string,
  images: { dataUrl: string }[],
): OpenAiContent {
  if (!images.length) return text || '(image attachment)'
  const parts: Array<OpenAiTextPart | OpenAiImagePart> = []
  const body = text.trim() || 'Please review the attached image(s).'
  parts.push({ type: 'text', text: body })
  for (const img of images) {
    parts.push({ type: 'image_url', image_url: { url: img.dataUrl } })
  }
  return parts
}

async function buildOpenAiMessages(
  personaId: string,
  conversationId: string,
  currentMessage: string,
  images: { id: string; dataUrl: string }[],
  abCompare: boolean,
): Promise<OpenAiChatMessage[]> {
  const system: OpenAiChatMessage = {
    role: 'system',
    content: await systemPromptForPersona(personaId, currentMessage, abCompare),
  }
  const detail = await storeChatConversationDetail(conversationId)
  const recent = (detail?.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-HISTORY_MESSAGE_LIMIT)
  // Prior turns: text-only (token budget). Current user turn: multimodal.
  const history: OpenAiChatMessage[] = recent.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content || (m.images?.length ? '(image attachment)' : ''),
  }))
  history.push({
    role: 'user',
    content: userContentWithImages(currentMessage, images),
  })
  return [system, ...history]
}

function normalizeImageIds(payload: ChatSendPayload): string[] {
  return (payload.imageIds ?? []).map((id) => id.trim()).filter(Boolean)
}

/** Async generator of NDJSON chat events for native OpenAI streaming. */
export async function* nativeChatStreamEvents(
  payload: ChatSendPayload,
): AsyncGenerator<ChatStreamEvent> {
  const message = payload.message.trim()
  const imageIds = normalizeImageIds(payload)
  if (!message && imageIds.length === 0) {
    yield { type: 'error', message: 'Message or image is required' }
    return
  }
  if (!payload.personaId.trim()) {
    yield { type: 'error', message: 'personaId is required' }
    return
  }

  let images: { id: string; dataUrl: string }[] = []
  if (imageIds.length > 0) {
    const resolved = resolveChatImages(imageIds)
    if (!resolved.ok) {
      yield { type: 'error', message: resolved.error }
      return
    }
    images = resolved.images
  }

  const abCompare = shouldEnableAbCompare(payload.abCompare, images.length)
  const turnPayload: ChatSendPayload = {
    ...payload,
    message: message || (images.length ? '(image attachment)' : ''),
    imageIds,
    abCompare,
  }

  const turn = await storeChatBeginUserTurn(turnPayload, { images, abCompare })
  if ('error' in turn) {
    yield { type: 'error', message: turn.error }
    return
  }

  try {
    const client = createOpenAiClient()
    const stream = await client.chat.completions.create({
      model: getAiOpenAiModel(),
      stream: true,
      messages: await buildOpenAiMessages(
        payload.personaId,
        turn.conversationId,
        message,
        images,
        abCompare,
      ),
      temperature: 0.7,
    })

    let full = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) {
        full += text
        yield { type: 'delta', text }
      }
    }

    const detail = await storeChatConversationDetail(turn.conversationId)
    const proposal = maybeProposeInspectWebsite(
      message,
      payload.personaId,
      payload.projectId ?? null,
      turn.conversationId,
      (detail?.messages ?? [])
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .slice(-8),
    )
    if (proposal) yield proposal

    const done = await storeChatAppendAssistant(turn.conversationId, full || '…')
    yield {
      type: 'done',
      conversationId: done.conversationId,
      messageId: done.messageId,
    }
  } catch (error) {
    const err = toAiNativeError(error, 'Chat stream failed')
    yield { type: 'error', message: err.detail || err.error }
  }
}

export function nativeChatNdjsonResponse(payload: ChatSendPayload): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of nativeChatStreamEvents(payload)) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'stream failed'
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ type: 'error', message })}\n`),
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
