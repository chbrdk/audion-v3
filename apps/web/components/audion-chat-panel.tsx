'use client'

import React, { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ChatConversationDetail,
  ChatMessage,
  PersonaSummary,
} from '@audion-v3/contracts'
import {
  Alert,
  Button,
  EmptyState,
  Field,
  LoadingText,
  Textarea,
} from '@msqdx/ui'
import { ChatAnswer } from '../lib/chat/chat-answer'
import { postChatStream } from '../lib/chat/stream-client'
import { paths } from '../lib/paths'
import { IconSend } from './nav-icons'

type Props = {
  personas: PersonaSummary[]
  personaId: string
  onBusyChange?: (busy: boolean) => void
  initialConversation: ChatConversationDetail | null
  initialDraft?: string | null
}

export function AudionChatPanel({
  personas,
  personaId,
  onBusyChange,
  initialConversation,
  initialDraft = null,
}: Props) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversation?.id ?? null,
  )
  const [turns, setTurns] = useState<ChatMessage[]>(initialConversation?.messages ?? [])
  const [draft, setDraft] = useState(initialDraft?.trim() || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const personaIdRef = useRef(personaId)

  const persona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId],
  )

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  useEffect(() => {
    if (personaIdRef.current === personaId) return
    personaIdRef.current = personaId
    abortRef.current?.abort()
    setBusy(false)
    setConversationId(null)
    setTurns([])
    setErr(null)
    setComposerError(null)
    syncUrl({ personaId, conversationId: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncUrl closes over latest ids
  }, [personaId])

  useEffect(() => {
    const el = listRef.current
    if (!el || typeof el.scrollTo !== 'function') return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns, busy])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function syncUrl(next: { personaId?: string; conversationId?: string | null }) {
    const params = new URLSearchParams()
    const pid = next.personaId ?? personaId
    const cid = next.conversationId === undefined ? conversationId : next.conversationId
    if (pid) params.set('personaId', pid)
    if (cid) params.set('conversationId', cid)
    const qs = params.toString()
    router.replace(qs ? `${paths.routes.chat}?${qs}` : paths.routes.chat)
  }

  async function sendMessage(raw: string) {
    const message = raw.trim()
    if (!message) {
      setComposerError('Message is required')
      return
    }
    if (!personaId) {
      setErr('Pick a persona before chatting.')
      return
    }
    setComposerError(null)
    setErr(null)
    setDraft('')
    setBusy(true)

    const userTurn: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
      status: 'complete',
    }
    const streamingId = `local-asst-${Date.now()}`
    setTurns((prev) => [
      ...prev,
      userTurn,
      {
        id: streamingId,
        role: 'assistant',
        content: '',
        createdAt: null,
        status: 'streaming',
      },
    ])

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      await postChatStream(
        {
          personaId,
          message,
          conversationId,
          projectId: persona?.projectId ?? null,
        },
        (event) => {
          if (event.type === 'delta') {
            setTurns((prev) =>
              prev.map((t) =>
                t.id === streamingId
                  ? { ...t, content: `${t.content}${event.text}`, status: 'streaming' }
                  : t,
              ),
            )
          } else if (event.type === 'done') {
            setConversationId(event.conversationId)
            setTurns((prev) =>
              prev.map((t) =>
                t.id === streamingId
                  ? {
                      ...t,
                      id: event.messageId || t.id,
                      status: 'complete',
                      createdAt: new Date().toISOString(),
                    }
                  : t,
              ),
            )
            syncUrl({ conversationId: event.conversationId })
          } else if (event.type === 'error') {
            setErr(event.message)
            setTurns((prev) =>
              prev.map((t) =>
                t.id === streamingId ? { ...t, status: 'error', content: t.content || event.message } : t,
              ),
            )
          }
        },
        controller.signal,
      )
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setErr(error instanceof Error ? error.message : 'Stream failed')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void sendMessage(draft)
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    void sendMessage(draft)
  }

  function onStop() {
    abortRef.current?.abort()
    setBusy(false)
  }

  return (
    <section className="chat-panel chat-panel-open audion-chat-panel" aria-label="Persona chat">
      <div className="chat-turns" ref={listRef}>
        {!turns.length && !busy ? (
          <EmptyState className="chat-empty">
            Ask {persona?.name || 'the persona'} something grounded in their magazine brief.
          </EmptyState>
        ) : null}
        {turns.map((turn) => (
          <article
            key={turn.id}
            className={
              turn.role === 'user' ? 'chat-turn chat-turn-user' : 'chat-turn chat-turn-assistant'
            }
          >
            <span className="chat-role">{turn.role === 'user' ? 'You' : 'Persona'}</span>
            {turn.role === 'assistant' ? (
              turn.content ? (
                <ChatAnswer answer={turn.content} />
              ) : (
                <LoadingText>Thinking…</LoadingText>
              )
            ) : (
              <p className="chat-text">{turn.content}</p>
            )}
          </article>
        ))}
        {busy ? <LoadingText>Streaming…</LoadingText> : null}
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}

      <form
        className={['chat-form', draft.trim() ? 'is-expanded' : undefined].filter(Boolean).join(' ')}
        onSubmit={onSubmit}
      >
        <Field label="Message" error={composerError ?? undefined} htmlFor="chat-composer">
          <Textarea
            id="chat-composer"
            size="md"
            block
            rows={2}
            className="chat-composer"
            value={draft}
            onChange={(ev) => {
              setDraft(ev.target.value)
              if (composerError) setComposerError(null)
            }}
            onKeyDown={onComposerKeyDown}
            placeholder="Ask about goals, channels, or a decision…"
            disabled={busy}
            autoComplete="off"
            aria-label="Chat message"
          />
        </Field>
        {busy ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="chat-send"
            aria-label="Stop"
            onClick={onStop}
          >
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="chat-send chat-send-icon"
            icon={<IconSend />}
            disabled={draft.trim().length < 1 || !personaId}
            aria-label="Send"
          />
        )}
      </form>
    </section>
  )
}
