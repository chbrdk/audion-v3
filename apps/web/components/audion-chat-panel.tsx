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
  EventFooter,
  Field,
  InspectDock,
  LoadingText,
  Textarea,
} from '@msqdx/ui'
import { ChatAnswer } from '../lib/chat/chat-answer'
import { toolCompleteFromInspect } from '../lib/chat/messages-column'
import { postChatStream } from '../lib/chat/stream-client'
import {
  chatUxJourneyStepLabel,
  composeMessageWithUxStepContext,
  parseUxStepFollowUpDisplay,
} from '../lib/chat/ux-journey-steps'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { ChatInspectResultMeta } from './chat-inspect-result-meta'
import { IconSend } from './nav-icons'
import { ScanInCheckionCta } from './scan-in-checkion-cta'
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
  guestBudget?: {
    sessionId: string
    remainingTurns: number
    maxTurns: number
    maxChars: number
  } | null
}

function UserTurnBody({ content }: { content: string }) {
  const t = useT()
  const parsed = parseUxStepFollowUpDisplay(content)
  if (!parsed.meta) {
    return <p className="chat-text">{content}</p>
  }
  return (
    <div className="audion-chat-user-step-followup">
      <p className="audion-chat-user-step-meta">{t('chatExtra.about', { meta: parsed.meta })}</p>
      <p className="chat-text">{parsed.body}</p>
    </div>
  )
}

/** Where the inspect dock sits in the transcript: before the first step follow-up, else after all turns. */
function inspectDockSplitIndex(messages: ChatMessage[]): number {
  const idx = messages.findIndex(
    (m) => m.role === 'user' && Boolean(parseUxStepFollowUpDisplay(m.content).meta),
  )
  return idx >= 0 ? idx : messages.length
}

function ChatTurnArticle({ turn }: { turn: ChatMessage }) {
  const t = useT()
  return (
    <article
      className={turn.role === 'user' ? 'chat-turn chat-turn-user' : 'chat-turn chat-turn-assistant'}
    >
      <span className="chat-role">
        {turn.role === 'user' ? t('chat.roleYou') : t('chat.rolePersona')}
      </span>
      {turn.role === 'assistant' ? (
        turn.content ? (
          <ChatAnswer answer={turn.content} />
        ) : (
          <LoadingText>{t('chat.thinking')}</LoadingText>
        )
      ) : (
        <UserTurnBody content={turn.content} />
      )}
    </article>
  )
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
  guestBudget = null,
}: Props) {
  const t = useT()
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversation?.id ?? null,
  )
  const [turns, setTurns] = useState<ChatMessage[]>(initialConversation?.messages ?? [])
  const [draft, setDraft] = useState(initialDraft?.trim() || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [guestRemaining, setGuestRemaining] = useState(guestBudget?.remainingTurns ?? null)
  const [pendingTool, setPendingTool] = useState<ChatToolProposedEvent | null>(null)
  const [toolBusy, setToolBusy] = useState(false)
  const [toolProgress, setToolProgress] = useState<string[]>([])
  const [inspectSteps, setInspectSteps] = useState<ChatUxJourneyStep[]>(
    () => initialConversation?.inspect?.steps ?? [],
  )
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)
  const [toolComplete, setToolComplete] = useState<ChatToolCompleteEvent | null>(() => {
    const inspect = initialConversation?.inspect
    if (!inspect) return null
    if (!inspect.steps?.length && !inspect.summary) return null
    return toolCompleteFromInspect(inspect)
  })
  const [inspectJobId, setInspectJobId] = useState<string | null>(
    () => initialConversation?.inspect?.jobId ?? null,
  )
  const [inspectDockAt, setInspectDockAt] = useState<number | null>(() => {
    const inspect = initialConversation?.inspect
    if (!inspect) return null
    if (!inspect.steps?.length && !inspect.summary) return null
    return inspectDockSplitIndex(initialConversation?.messages ?? [])
  })
  const [convertBusy, setConvertBusy] = useState(false)
  const [convertedJourneyId, setConvertedJourneyId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const personaIdRef = useRef(personaId)
  const turnsRef = useRef(turns)
  turnsRef.current = turns

  const persona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId],
  )

  const showInspectDock = Boolean(
    inspectSteps.length || toolComplete || (inspectJobId && !toolComplete),
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
    setSelectedStepIndex(null)
    setToolComplete(null)
    setInspectJobId(null)
    setInspectDockAt(null)
    setConvertedJourneyId(null)
    syncUrl({ personaId, conversationId: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncUrl closes over latest ids
  }, [personaId])

  useEffect(() => {
    if (selectedStepIndex == null) return
    if (selectedStepIndex < 0 || selectedStepIndex >= inspectSteps.length) {
      setSelectedStepIndex(null)
    }
  }, [selectedStepIndex, inspectSteps.length])

  // Scroll message list on turns / tool chrome — not on every live step tick.
  useEffect(() => {
    const el = listRef.current
    if (!el || typeof el.scrollTo !== 'function') return
    const lastTurn = el.querySelector<HTMLElement>('.chat-turn:last-of-type')
    if (lastTurn) {
      lastTurn.scrollIntoView({ block: 'end', behavior: 'smooth' })
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns, busy, pendingTool, toolProgress])

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
      setSelectedStepIndex(null)
      setInspectJobId(null)
      setInspectDockAt(null)
      setConvertedJourneyId(null)
    } else if (event.type === 'tool_started' || event.type === 'tool_progress') {
      setToolProgress((prev) => [...prev, event.message])
      if ('jobId' in event && event.jobId) setInspectJobId(event.jobId)
      if (event.type === 'tool_progress' && Array.isArray(event.steps)) {
        setInspectSteps(event.steps)
      }
      setInspectDockAt((prev) => prev ?? turnsRef.current.length)
    } else if (event.type === 'tool_complete') {
      setPendingTool(null)
      setToolComplete(event)
      if (event.jobId) setInspectJobId(event.jobId)
      if (Array.isArray(event.steps)) setInspectSteps(event.steps)
      setInspectDockAt((prev) => prev ?? turnsRef.current.length)
    } else if (event.type === 'tool_denied') {
      setPendingTool(null)
      setToolProgress([])
      setInspectJobId(null)
      setInspectSteps([])
      setSelectedStepIndex(null)
      setToolComplete(null)
      setInspectDockAt(null)
    }
  }

  function selectStepForChat(index: number | null) {
    setSelectedStepIndex(index)
    if (index != null) {
      requestAnimationFrame(() => {
        document.getElementById('chat-composer')?.focus()
      })
    }
  }

  async function sendMessage(raw: string) {
    const message = raw.trim()
    if (!message) {
      setComposerError(t('chat.messageRequired'))
      return
    }
    if (!personaId) {
      setErr(t('chatExtra.pickPersona'))
      return
    }
    if (guestBudget && guestRemaining != null && guestRemaining <= 0) {
      setComposerError(t('chatExtra.guestLimitReached'))
      return
    }
    if (guestBudget && message.length > guestBudget.maxChars) {
      setComposerError(t('chatExtra.messageTooLong'))
      return
    }

    const selected =
      selectedStepIndex != null && selectedStepIndex >= 0 && selectedStepIndex < inspectSteps.length
        ? inspectSteps[selectedStepIndex]
        : null
    const composed = selected
      ? composeMessageWithUxStepContext(message, selected, selectedStepIndex ?? 0)
      : { display: message, api: message }

    setComposerError(null)
    setErr(null)
    setDraft('')
    setBusy(true)
    setPendingTool(null)
    // Keep inspect dock / selection so follow-up chat about a step stays possible.
    // Inspect UI is session-only (not restored from conversation history).

    const userTurn: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: composed.display,
      createdAt: new Date().toISOString(),
      status: 'complete',
    }
    const streamingId = `local-asst-${Date.now()}`
    setTurns((prev) => {
      const next: ChatMessage[] = [
        ...prev,
        userTurn,
        {
          id: streamingId,
          role: 'assistant',
          content: '',
          createdAt: null,
          status: 'streaming',
        },
      ]
      // Keep ref in sync for tool events that may fire before the next render.
      turnsRef.current = next
      return next
    })

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      await postChatStream(
        {
          personaId,
          message: composed.api,
          conversationId,
          projectId: shareProjectId ?? persona?.projectId ?? null,
          guestSessionId: guestBudget?.sessionId ?? null,
        },
        (event) => handleStreamEvent(streamingId, event),
        controller.signal,
      )
      if (guestRemaining != null) {
        setGuestRemaining((n) => (n == null ? n : Math.max(0, n - 1)))
      }
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
          agentTask: pendingTool.agentTask ?? null,
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

  const dockSplit = inspectDockAt ?? turns.length
  const turnsBeforeDock = turns.slice(0, dockSplit)
  const turnsAfterDock = turns.slice(dockSplit)

  return (
    <section className="chat-panel chat-panel-open audion-chat-panel" aria-label={t('chat.panelAria')}>
      <div className="chat-turns" ref={listRef}>
        {!turns.length && !busy ? (
          <EmptyState className="chat-empty">
            {t('chat.empty', { name: persona?.name || t('chat.emptyFallbackName') })}
          </EmptyState>
        ) : null}
        {turnsBeforeDock.map((turn) => (
          <ChatTurnArticle key={turn.id} turn={turn} />
        ))}

        {pendingTool ? (
          <div className="audion-chat-tool-card" role="group" aria-label={t('chatExtra.toolApproval')}>
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
                {toolBusy ? t('common.working') : t('common.approve')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={toolBusy}
                onClick={() => void decideTool('deny')}
              >
                {t('common.deny')}
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

        {showInspectDock ? (
          <InspectDock aria-label={t('chatExtra.uxJourneyInspect')}>
            {inspectSteps.length || (inspectJobId && !toolComplete) ? (
              <UxJourneyStepsStrip
                steps={inspectSteps}
                stepsTotal={toolComplete?.stepsTotal ?? inspectSteps.length}
                running={Boolean(inspectJobId && !toolComplete)}
                selectedIndex={selectedStepIndex}
                onSelectStep={selectStepForChat}
              />
            ) : null}

            {toolComplete ? (
              <EventFooter
                summary={toolComplete.summary}
                actions={
                  <>
                    {toolComplete.videoUrl || toolComplete.jobId ? (
                      <a
                        className="audion-link"
                        href={
                          toolComplete.videoUrl ||
                          paths.routes.apiUxJourneyAgentVideo(toolComplete.jobId || inspectJobId || '')
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('chatExtra.openRecording')}
                      </a>
                    ) : null}
                    <ScanInCheckionCta
                      url={toolComplete.convert?.url}
                      audionProjectId={shareProjectId ?? persona?.projectId ?? null}
                      audionRunId={toolComplete.jobId || inspectJobId || toolComplete.convert?.jobId}
                    />
                    {allowConvert && toolComplete.convert && !convertedJourneyId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={convertBusy}
                        onClick={() => void convertFromInspect()}
                      >
                        {convertBusy ? t('common.converting') : t('chatExtra.convertJourney')}
                      </Button>
                    ) : null}
                    {convertedJourneyId ? (
                      <span className="audion-chat-tool-complete-done">
                        {t('chatExtra.journeyCreated')}{' '}
                        <Link className="audion-link" href={paths.routes.journeyDetail(convertedJourneyId)}>
                          {t('chatExtra.openJourney')}
                        </Link>
                      </span>
                    ) : null}
                  </>
                }
              >
                <ChatInspectResultMeta
                  scorecard={toolComplete.scorecard}
                  personaPolicy={toolComplete.personaPolicy}
                />
              </EventFooter>
            ) : null}
          </InspectDock>
        ) : null}

        {turnsAfterDock.map((turn) => (
          <ChatTurnArticle key={turn.id} turn={turn} />
        ))}

        {busy ? <LoadingText>{t('chat.streaming')}</LoadingText> : null}
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}

      <form
        className={['chat-form', draft.trim() || selectedStepIndex != null ? 'is-expanded' : undefined]
          .filter(Boolean)
          .join(' ')}
        onSubmit={onSubmit}
      >
        {selectedStepIndex != null && inspectSteps[selectedStepIndex] ? (
          <div className="audion-chat-step-context" role="status">
            <span className="audion-chat-step-context-label">
              {t('chatExtra.chattingAbout')}{' '}
              <strong>{chatUxJourneyStepLabel(inspectSteps[selectedStepIndex]!, selectedStepIndex)}</strong>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="audion-chat-step-context-clear"
              onClick={() => selectStepForChat(null)}
            >
              {t('common.clear')}
            </Button>
          </div>
        ) : null}
        {composerLeading}
        {guestBudget ? (
          <p className="audion-edit-lede" role="status" data-testid="guest-budget-hint">
            {guestRemaining != null && guestRemaining <= 0
              ? t('chatExtra.guestLimitReached')
              : t('chatExtra.guestMessagesLeft', {
                  n: guestRemaining ?? guestBudget.remainingTurns,
                  m: guestBudget.maxTurns,
                })}
          </p>
        ) : null}
        <Field label={t('chat.message')} error={composerError ?? undefined} htmlFor="chat-composer">
          <Textarea
            id="chat-composer"
            size="md"
            block
            rows={1}
            className="chat-composer"
            value={draft}
            maxLength={guestBudget?.maxChars}
            onChange={(ev) => {
              setDraft(ev.target.value)
              if (composerError) setComposerError(null)
            }}
            onKeyDown={onComposerKeyDown}
            placeholder={
              selectedStepIndex != null ? t('chat.placeholderStep') : t('chat.placeholder')
            }
            disabled={busy || toolBusy || (guestRemaining != null && guestRemaining <= 0)}
            autoComplete="off"
            aria-label={t('chat.messageAria')}
          />
        </Field>
        {busy ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="chat-send"
            aria-label={t('chat.stop')}
            onClick={onStop}
          >
            {t('chat.stop')}
          </Button>
        ) : (
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="chat-send chat-send-icon"
            icon={<IconSend />}
            disabled={
              draft.trim().length < 1 ||
              !personaId ||
              toolBusy ||
              (guestRemaining != null && guestRemaining <= 0)
            }
            aria-label={t('chat.send')}
          />
        )}
      </form>
    </section>
  )
}
