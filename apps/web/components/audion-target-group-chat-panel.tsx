'use client'

import React, { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type {
  ChatStreamEvent,
  ChatTargetGroupRound,
  TargetGroupDetail,
} from '@audion-v3/contracts'
import { Alert, Button, EmptyState, Field, LoadingText, Textarea } from '@msqdx/ui'
import { ChatAnswer } from '../lib/chat/chat-answer'
import { postChatStream } from '../lib/chat/stream-client'
import {
  createTgRound,
  MAX_TG_CHAT_PERSONAS,
  selectTgChatPersonas,
} from '../lib/chat/tg-ask-all'
import { IconSend } from './nav-icons'

type Props = {
  targetGroup: TargetGroupDetail | null
  onBusyChange?: (busy: boolean) => void
}

function patchSlot(
  rounds: ChatTargetGroupRound[],
  roundId: string,
  personaId: string,
  patch: Partial<ChatTargetGroupRound['slots'][number]>,
): ChatTargetGroupRound[] {
  return rounds.map((round) => {
    if (round.id !== roundId) return round
    return {
      ...round,
      slots: round.slots.map((slot) =>
        slot.personaId === personaId ? { ...slot, ...patch } : slot,
      ),
    }
  })
}

export function AudionTargetGroupChatPanel({ targetGroup, onBusyChange }: Props) {
  const [rounds, setRounds] = useState<ChatTargetGroupRound[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const linked = selectTgChatPersonas(targetGroup?.linkedPersonas)
  const truncated =
    (targetGroup?.linkedPersonas?.length ?? 0) > MAX_TG_CHAT_PERSONAS

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  useEffect(() => {
    setRounds([])
    setDraft('')
    setErr(null)
    abortRef.current?.abort()
    setBusy(false)
  }, [targetGroup?.id])

  useEffect(() => {
    const el = listRef.current
    if (!el || typeof el.scrollTo !== 'function') return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [rounds])

  async function sendRound(question: string) {
    const trimmed = question.trim()
    if (!trimmed) {
      setComposerError('Enter a question for the target group.')
      return
    }
    if (!targetGroup || !linked.length) {
      setComposerError('Pick a target group with linked personas.')
      return
    }
    if (busy) return

    const round = createTgRound({ question: trimmed, linked })
    setRounds((prev) => [...prev, round])
    setDraft('')
    setComposerError(null)
    setErr(null)
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller

    await Promise.all(
      round.slots.map(async (slot) => {
        setRounds((prev) =>
          patchSlot(prev, round.id, slot.personaId, { status: 'streaming', content: '' }),
        )
        let content = ''
        try {
          await postChatStream(
            {
              personaId: slot.personaId,
              message: trimmed,
              conversationId: null,
              projectId: targetGroup.projectId,
            },
            (event: ChatStreamEvent) => {
              if (event.type === 'delta' && typeof event.text === 'string') {
                content += event.text
                setRounds((prev) =>
                  patchSlot(prev, round.id, slot.personaId, {
                    status: 'streaming',
                    content,
                  }),
                )
              } else if (event.type === 'error') {
                setRounds((prev) =>
                  patchSlot(prev, round.id, slot.personaId, {
                    status: 'error',
                    error: event.message || 'Stream failed',
                    content,
                  }),
                )
              } else if (event.type === 'done') {
                setRounds((prev) =>
                  patchSlot(prev, round.id, slot.personaId, {
                    status: 'complete',
                    content: content || slot.content,
                    error: null,
                  }),
                )
              }
            },
            controller.signal,
          )
          setRounds((prev) => {
            const current = prev
              .find((r) => r.id === round.id)
              ?.slots.find((s) => s.personaId === slot.personaId)
            if (current?.status === 'error') return prev
            return patchSlot(prev, round.id, slot.personaId, {
              status: 'complete',
              content: content || current?.content || '',
              error: null,
            })
          })
        } catch (error) {
          if ((error as Error).name === 'AbortError') return
          setRounds((prev) =>
            patchSlot(prev, round.id, slot.personaId, {
              status: 'error',
              error: error instanceof Error ? error.message : 'Stream failed',
              content,
            }),
          )
        }
      }),
    )

    setBusy(false)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void sendRound(draft)
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    void sendRound(draft)
  }

  function onStop() {
    abortRef.current?.abort()
    setBusy(false)
  }

  return (
    <section
      className="chat-panel chat-panel-open audion-chat-panel audion-tg-chat-panel"
      aria-label="Target group chat"
    >
      <div className="chat-turns audion-tg-chat-rounds" ref={listRef}>
        {!targetGroup ? (
          <EmptyState className="chat-empty">
            Pick a target group to ask all linked personas at once.
          </EmptyState>
        ) : !linked.length ? (
          <EmptyState className="chat-empty">
            {targetGroup.name} has no linked personas yet.
          </EmptyState>
        ) : !rounds.length && !busy ? (
          <EmptyState className="chat-empty">
            Ask up to {linked.length} persona{linked.length === 1 ? '' : 's'} in{' '}
            {targetGroup.name}
            {truncated ? ` (first ${MAX_TG_CHAT_PERSONAS})` : ''} — answers appear side by side.
          </EmptyState>
        ) : null}

        {rounds.map((round) => (
          <article key={round.id} className="audion-tg-chat-round">
            <div className="chat-turn chat-turn-user audion-tg-chat-question">
              <span className="chat-role">You</span>
              <p className="chat-text">{round.question}</p>
            </div>
            <ul className="audion-tg-chat-grid" aria-label="Persona answers">
              {round.slots.map((slot) => (
                <li key={slot.personaId} className="audion-tg-chat-slot" data-status={slot.status}>
                  <header className="audion-tg-chat-slot-head">
                    <span className="audion-tg-chat-slot-name">{slot.personaName}</span>
                    <span className="audion-tg-chat-slot-role">{slot.role}</span>
                  </header>
                  {slot.status === 'pending' || (slot.status === 'streaming' && !slot.content) ? (
                    <LoadingText>Thinking…</LoadingText>
                  ) : null}
                  {slot.content ? <ChatAnswer answer={slot.content} /> : null}
                  {slot.status === 'error' && slot.error ? (
                    <p className="audion-edit-error" role="alert">
                      {slot.error}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}

      <form
        className={['chat-form', draft.trim() ? 'is-expanded' : undefined].filter(Boolean).join(' ')}
        onSubmit={onSubmit}
      >
        <Field label="Message" error={composerError ?? undefined} htmlFor="tg-chat-composer">
          <Textarea
            id="tg-chat-composer"
            size="md"
            block
            rows={1}
            className="chat-composer"
            value={draft}
            onChange={(ev) => {
              setDraft(ev.target.value)
              if (composerError) setComposerError(null)
            }}
            onKeyDown={onComposerKeyDown}
            placeholder={
              linked.length
                ? `Ask all ${linked.length} personas…`
                : 'Select a target group with personas…'
            }
            disabled={busy || !linked.length}
            autoComplete="off"
          />
        </Field>
        {busy ? (
          <Button type="button" variant="ghost" size="sm" className="chat-send" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            className="chat-send"
            icon={<IconSend />}
            aria-label="Send to all personas"
            disabled={!linked.length || !draft.trim()}
          />
        )}
      </form>
    </section>
  )
}
