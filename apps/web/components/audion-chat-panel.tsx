'use client'

import React, { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  ChatConversationDetail,
  ChatMessage,
  ChatStreamEvent,
  ChatToolCompleteEvent,
  ChatToolProposedEvent,
  ChatUxJourneyStep,
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
import { UxJourneyLivePoll } from './ux-journey-live-poll'
import { UxJourneyStepsStrip } from './ux-journey-steps-strip'

type Props = {
  personas: PersonaSummary[]
  personaId: string
  onBusyChange?: (busy: boolean) => void
  initialConversation: ChatConversationDetail | null
  initialDraft?: string | null
  shareProjectId?: string | null
  allowConvert?: boolean
  /** Icon toolbar left of the composer (modality / share / history). */
  composerLeading?: React.ReactNode
}

export function AudionChatPanel({
  personas,
  personaId,
  onBusyChange,
  initialConversation,
  initialDraft = null,
  shareProjectId = null,
  allowConvert = true,
  composerLeading = null,
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
  const [pendingTool, setPendingTool] = useState<ChatToolProposedEvent | null>(null)
  const [toolBusy, setToolBusy] = useState(false)
  const [toolProgress, setToolProgress] = useState<string[]>([])
  const [inspectSteps, setInspectSteps] = useState<ChatUxJourneyStep[]>([])
  const [toolComplete, setToolComplete] = useState<ChatToolCompleteEvent | null>(null)
  const [inspectJobId, setInspectJobId] = useState<string | null>(null)
  const [convertBusy, setConvertBusy] = useState(false)
  const [convertedJourneyId, setConvertedJourneyId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const personaIdRef = useRef(personaId)

  const persona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId],
  )

  useEffect(() => {
    onBusyChange?.(busy || toolBusy)
  }, [busy, toolBusy, onBusyChange])

  useEffect(() => {
    if (personaIdRef.current === personaId) return
    personaIdRef.current = personaId
    abortRef.current?.abort()
    setBusy(false)
    setConversationId(null)
    setTurns([])
    setErr(null)
    setComposerError(null)
    setPendingTool(null)
    setToolProgress([])
    setInspectSteps([])
    setToolComplete(null)
    setInspectJobId(null)
    setConvertedJourneyId(null)
    syncUrl({ personaId, conversationId: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncUrl closes over latest ids
  }, [personaId])

  useEffect(() => {
    const el = listRef.current
    if (!el || typeof el.scrollTo !== 'function') return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns, busy, pendingTool, toolProgress, toolComplete, inspectSteps])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function syncUrl(next: { personaId?: string; conversationId?: string | null }) {
    const params = new URLSearchParams()
    const pid = next.personaId ?? personaId
    const cid = next.conversationId === undefined ? conversationId : next.conversationId
    if (pid) params.set('personaId', pid)
    if (cid) params.set('conversationId', cid)
    if (shareProjectId) params.set('projectId', shareProjectId)
    const qs = params.toString()
    router.replace(qs ? `${paths.routes.chat}?${qs}` : paths.routes.chat)
  }

  function handleStreamEvent(streamingId: string, event: ChatStreamEvent) {
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
    } else if (event.type === 'tool_proposed') {
      setPendingTool(event)
      setToolComplete(null)
      setToolProgress([])
      setInspectSteps([])
      setInspectJobId(null)
      setConvertedJourneyId(null)
    } else if (event.type === 'tool_started' || event.type === 'tool_progress') {
      setToolProgress((prev) => [...prev, event.message])
      if ('jobId' in event && event.jobId) setInspectJobId(event.jobId)
      if (event.type === 'tool_progress' && Array.isArray(event.steps)) {
        setInspectSteps(event.steps)
      }
    } else if (event.type === 'tool_complete') {
      setPendingTool(null)
      setToolComplete(event)
      if (event.jobId) setInspectJobId(event.jobId)
      if (Array.isArray(event.steps)) setInspectSteps(event.steps)
    } else if (event.type === 'tool_denied') {
      setPendingTool(null)
      setToolProgress((prev) => [...prev, event.message])
    }
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
    setPendingTool(null)
    setToolComplete(null)
    setInspectJobId(null)
    setToolProgress([])
    setInspectSteps([])
    setConvertedJourneyId(null)

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
          projectId: shareProjectId ?? persona?.projectId ?? null,
        },
        (event) => handleStreamEvent(streamingId, event),
        controller.signal,
      )
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setErr(error instanceof Error ? error.message : 'Stream failed')
    } finally {
      setBusy(false)
    }
  }

  async function decideTool(decision: 'approve' | 'deny') {
    if (!pendingTool) return
    setToolBusy(true)
    setErr(null)
    try {
      const res = await fetch(paths.routes.apiChatToolDecision(pendingTool.callId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        body: JSON.stringify({
          decision,
          conversationId,
          personaId,
          projectId: shareProjectId ?? persona?.projectId ?? null,
        }),
      })
      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(errBody?.error || `Decision failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          handleStreamEvent('', JSON.parse(trimmed) as ChatStreamEvent)
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Tool decision failed')
    } finally {
      setToolBusy(false)
    }
  }

  async function convertFromInspect() {
    if (!toolComplete?.convert || !allowConvert) return
    setConvertBusy(true)
    setErr(null)
    try {
      const res = await fetch(paths.routes.apiJourneyFromUxRun, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'chat_inspect',
          jobId: toolComplete.convert.jobId,
          personaId: toolComplete.convert.personaId,
          url: toolComplete.convert.url,
          task: toolComplete.convert.task,
          projectId: shareProjectId ?? persona?.projectId ?? null,
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        journey?: { id: string }
        error?: string
      } | null
      if (!res.ok) throw new Error(data?.error || `Convert failed (${res.status})`)
      if (data?.journey?.id) setConvertedJourneyId(data.journey.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Convert failed')
    } finally {
      setConvertBusy(false)
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

        {pendingTool ? (
          <div className="audion-chat-tool-card" role="group" aria-label="Tool approval">
            <p className="audion-chat-tool-title">{pendingTool.title}</p>
            <p className="audion-edit-lede">{pendingTool.detail}</p>
            {pendingTool.url ? (
              <p className="audion-edit-lede">
                <code>{pendingTool.url}</code>
              </p>
            ) : null}
            <div className="audion-chat-tool-actions">
              <Button
                type="button"
                size="sm"
                disabled={toolBusy}
                onClick={() => void decideTool('approve')}
              >
                {toolBusy ? 'Working…' : 'Approve'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={toolBusy}
                onClick={() => void decideTool('deny')}
              >
                Deny
              </Button>
            </div>
          </div>
        ) : null}

        {toolProgress.length ? (
          <ul className="audion-chat-tool-progress">
            {toolProgress.slice(-6).map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        ) : null}

        {inspectJobId && !toolComplete ? <UxJourneyLivePoll jobId={inspectJobId} /> : null}

        {inspectSteps.length || (inspectJobId && !toolComplete) ? (
          <UxJourneyStepsStrip
            steps={inspectSteps}
            stepsTotal={toolComplete?.stepsTotal ?? inspectSteps.length}
            running={Boolean(inspectJobId && !toolComplete)}
          />
        ) : null}

        {toolComplete ? (
          <div className="audion-chat-tool-complete">
            <p className="audion-edit-lede">{toolComplete.summary}</p>
            {toolComplete.videoUrl || toolComplete.jobId ? (
              <p className="audion-edit-lede">
                <a
                  className="audion-link"
                  href={
                    toolComplete.videoUrl ||
                    paths.routes.apiUxJourneyAgentVideo(toolComplete.jobId || inspectJobId || '')
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open recording
                </a>
              </p>
            ) : null}
            {allowConvert && toolComplete.convert && !convertedJourneyId ? (
              <Button
                type="button"
                size="sm"
                disabled={convertBusy}
                onClick={() => void convertFromInspect()}
              >
                {convertBusy ? 'Converting…' : 'Convert to journey'}
              </Button>
            ) : null}
            {convertedJourneyId ? (
              <p className="audion-edit-lede">
                Journey created —{' '}
                <Link className="audion-link" href={paths.routes.journeyDetail(convertedJourneyId)}>
                  Open journey
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {busy ? <LoadingText>Streaming…</LoadingText> : null}
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}

      <form
        className={['chat-form', draft.trim() ? 'is-expanded' : undefined].filter(Boolean).join(' ')}
        onSubmit={onSubmit}
      >
        {composerLeading}
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
            placeholder="Ask about goals, channels, or paste a URL to inspect…"
            disabled={busy || toolBusy}
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
            disabled={draft.trim().length < 1 || !personaId || toolBusy}
            aria-label="Send"
          />
        )}
      </form>
    </section>
  )
}
