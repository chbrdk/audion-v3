/**
 * Native chat NDJSON stream — OpenAI completions → V3 ChatStreamEvent.
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts'
import { createOpenAiClient, getAiOpenAiModel, getChatCompletionMaxTokens, toAiNativeError } from '../ai/client'
import {
  storeChatAppendAssistant,
  storeChatBeginUserTurn,
  storeChatConversationDetail,
} from '../fixtures/chat-store'
import { maybeProposeInspectWebsite } from '../fixtures/chat-share'
import { abCompareSystemInstruction, shouldEnableAbCompare } from './ab-compare'
import { resolveChatDocuments } from './document-upload-store'
import { resolveChatImages } from './image-upload-store'
import { mergeUserMessageWithDocuments } from './merge-documents'
import { extractUrlFromMessage } from './share'
import { resolvePersonaSystemPrompt } from '../fixtures/persona-prompts-store'
import { mergeRelevantContext } from '../knowledge/rag/merge-context'
import { retrieveKnowledgeSources } from '../knowledge/rag/store'

const HISTORY_MESSAGE_LIMIT = 12

type OpenAiTextPart = { type: 'text'; text: string }
type OpenAiImagePart = { type: 'image_url'; image_url: { url: string } }
type OpenAiUserContent = string | Array<OpenAiTextPart | OpenAiImagePart>

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
): OpenAiUserContent {
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
  /** Raw user text (URL / inspect heuristics). */
  rawMessage: string,
  /** Model-facing text (may include merged DOCX). */
  modelMessage: string,
  images: { id: string; dataUrl: string }[],
  abCompare: boolean,
): Promise<ChatCompletionMessageParam[]> {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: await systemPromptForPersona(personaId, rawMessage, abCompare),
  }
  const detail = await storeChatConversationDetail(conversationId)
  const recent = (detail?.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-HISTORY_MESSAGE_LIMIT)
  // Prior turns: text-only (token budget). Current user turn: multimodal.
  const history: ChatCompletionMessageParam[] = recent.slice(0, -1).map((m) =>
    m.role === 'assistant'
      ? {
          role: 'assistant' as const,
          content: m.content || '',
        }
      : {
          role: 'user' as const,
          content:
            m.content ||
            (m.images?.length
              ? '(image attachment)'
              : m.documents?.length
                ? '(document attachment)'
                : ''),
        },
  )
  history.push({
    role: 'user',
    content: userContentWithImages(modelMessage, images),
  })
  return [system, ...history]
}

function normalizeImageIds(payload: ChatSendPayload): string[] {
  return (payload.imageIds ?? []).map((id) => id.trim()).filter(Boolean)
}

function normalizeDocumentIds(payload: ChatSendPayload): string[] {
  return (payload.documentIds ?? []).map((id) => id.trim()).filter(Boolean)
}

function placeholderUserContent(images: unknown[], documents: unknown[]): string {
  if (images.length) return '(image attachment)'
  if (documents.length) return '(document attachment)'
  return ''
}

/** Async generator of NDJSON chat events for native OpenAI streaming. */
export async function* nativeChatStreamEvents(
  payload: ChatSendPayload,
): AsyncGenerator<ChatStreamEvent> {
  const message = payload.message.trim()
  const imageIds = normalizeImageIds(payload)
  const documentIds = normalizeDocumentIds(payload)
  if (!message && imageIds.length === 0 && documentIds.length === 0) {
    yield { type: 'error', message: 'Message or attachment is required' }
    return
  }
  if (!payload.personaId.trim()) {
    yield { type: 'error', message: 'personaId is required' }
    return
  }

  let images: { id: string; dataUrl: string }[] = []
  if (imageIds.length > 0) {
    const resolved = await resolveChatImages(imageIds)
    if (!resolved.ok) {
      yield { type: 'error', message: resolved.error }
      return
    }
    images = resolved.images
  }

  let documents: Array<{
    id: string
    filename: string
    extractedText: string
    charCount: number
  }> = []
  if (documentIds.length > 0) {
    const resolved = await resolveChatDocuments(documentIds)
    if (!resolved.ok) {
      yield { type: 'error', message: resolved.error }
      return
    }
    documents = resolved.documents
  }

  const abCompare = shouldEnableAbCompare(payload.abCompare, images.length)
  const displayMessage = message || placeholderUserContent(images, documents)
  let modelMessage = mergeUserMessageWithDocuments(message, documents)

  let ragSources: Awaited<ReturnType<typeof retrieveKnowledgeSources>>['sources'] = []
  const projectId = payload.projectId?.trim() || ''
  const isGuest = Boolean(payload.guestSessionId?.trim())
  if (!isGuest && projectId && message) {
    const retrieved = await retrieveKnowledgeSources({ projectId, query: message })
    ragSources = retrieved.sources
    modelMessage = mergeRelevantContext(modelMessage, ragSources)
  }

  const turnPayload: ChatSendPayload = {
    ...payload,
    message: displayMessage,
    imageIds,
    documentIds,
    abCompare,
  }

  const turn = await storeChatBeginUserTurn(turnPayload, {
    images,
    documents: documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      charCount: d.charCount,
    })),
    abCompare,
  })
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
        modelMessage,
        images,
        abCompare,
      ),
      temperature: 0.7,
      max_tokens: getChatCompletionMaxTokens(),
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
      ...(ragSources.length ? { sources: ragSources } : {}),
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
