'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ChatConversationDetail,
  ChatModality,
  ChatShareMoodboard,
  ChatTavusSessionResponse,
  PersonaSummary,
} from '@audion-v3/contracts'
import { Button, Field, Text } from '@msqdx/ui'
import { AppShell } from './app-shell'
import { AudionChatPanel } from './audion-chat-panel'
import { ChatHistoryFlyout } from './chat-history-flyout'
import { ChatMoodboardStrip } from './chat-moodboard-strip'
import { ChatShareFlyout } from './chat-share-flyout'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { IconMic, IconVideo } from './nav-icons'

type Props = {
  personas: PersonaSummary[]
  initialPersonaId: string | null
  initialConversation: ChatConversationDetail | null
  initialDraft?: string | null
  /** Public share token (projectId query). */
  shareProjectId?: string | null
  /** Optional moodboard tiles for strip (share or workspace). */
  moodboardTiles?: ChatShareMoodboard['tiles']
}

function iconBtnClass(active?: boolean): string {
  return [
    'chat-send',
    'chat-send-icon',
    'audion-chat-composer-icon',
    active ? 'is-active' : undefined,
  ]
    .filter(Boolean)
    .join(' ')
}

export function AudionChatWorkspace({
  personas,
  initialPersonaId,
  initialConversation,
  initialDraft = null,
  shareProjectId = null,
  moodboardTiles,
}: Props) {
  const shareMode = Boolean(shareProjectId)
  const [personaId, setPersonaId] = useState(
    initialPersonaId || initialConversation?.personaId || personas[0]?.id || '',
  )
  const [busy, setBusy] = useState(false)
  const [modality, setModality] = useState<ChatModality>('text')
  const [tavusUrl, setTavusUrl] = useState<string | null>(null)
  const [tavusError, setTavusError] = useState<string | null>(null)
  const [tavusBusy, setTavusBusy] = useState(false)

  const personaOptions = useMemo(
    () => personas.map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
    [personas],
  )

  const persona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId],
  )

  const projectIdForShare = shareProjectId || persona?.projectId || null

  const toggleModality = useCallback((next: ChatModality) => {
    setModality((prev) => (prev === next ? 'text' : next))
  }, [])

  useEffect(() => {
    if (modality !== 'video' || shareMode) {
      setTavusUrl(null)
      return
    }
    let cancelled = false
    async function start() {
      setTavusBusy(true)
      setTavusError(null)
      try {
        const res = await fetch(paths.routes.apiChatTavusSession, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId }),
        })
        const data = (await res.json().catch(() => null)) as ChatTavusSessionResponse | null
        if (!res.ok) throw new Error((data as { error?: string })?.error || 'Tavus session failed')
        if (!cancelled) setTavusUrl(data?.conversationUrl ?? null)
      } catch (e) {
        if (!cancelled) setTavusError(e instanceof Error ? e.message : 'Tavus failed')
      } finally {
        if (!cancelled) setTavusBusy(false)
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [modality, personaId, shareMode])

  const composerLeading = shareMode ? null : (
    <div className="audion-chat-composer-actions" role="toolbar" aria-label="Chat modality">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass(modality === 'voice')}
        icon={<IconMic />}
        aria-label="Voice"
        aria-pressed={modality === 'voice'}
        disabled={busy}
        onClick={() => toggleModality('voice')}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass(modality === 'video')}
        icon={<IconVideo />}
        aria-label={tavusBusy ? 'Starting video…' : 'Video'}
        aria-pressed={modality === 'video'}
        disabled={busy || tavusBusy}
        onClick={() => toggleModality('video')}
      />
    </div>
  )

  return (
    <AppShell
      leading={
        shareMode ? (
          <div className="audion-chat-topbar-leading">
            <Text role="label" className="audion-chat-share-label">
              {persona?.name || 'Shared persona'}
            </Text>
            <span className="audion-chat-share-badge">Public share</span>
            <ChatMoodboardStrip
              personaId={personaId}
              projectId={shareProjectId}
              tiles={moodboardTiles}
            />
          </div>
        ) : (
          <div className="audion-chat-topbar-leading">
            <Field
              label="Persona"
              size="md"
              htmlFor="chat-persona"
              className="audion-chat-persona-field"
            >
              <Select
                id="chat-persona"
                options={personaOptions}
                value={personaId}
                onChange={setPersonaId}
                disabled={busy || !personaOptions.length}
              />
            </Field>
            <div className="audion-chat-topbar-actions" role="group" aria-label="Chat links">
              <ChatMoodboardStrip
                personaId={personaId}
                projectId={shareProjectId}
                tiles={moodboardTiles}
              />
              {projectIdForShare ? (
                <ChatShareFlyout
                  personaId={personaId}
                  personaName={persona?.name}
                  projectId={projectIdForShare}
                />
              ) : null}
              <ChatHistoryFlyout personaId={personaId} />
            </div>
          </div>
        )
      }
    >
      <h1 className="visually-hidden">{shareMode ? 'Shared chat' : 'Chat'}</h1>

      {modality === 'voice' && !shareMode ? (
        <p className="audion-edit-lede audion-chat-modality-note" role="status">
          Voice mode stub — mic UI deferred. Text chat still works below.
        </p>
      ) : null}

      {modality === 'video' && !shareMode ? (
        <div className="audion-chat-tavus" role="status">
          {tavusBusy ? <p className="audion-edit-lede">Starting video session…</p> : null}
          {tavusError ? <p className="audion-edit-error">{tavusError}</p> : null}
          {tavusUrl ? (
            <p className="audion-edit-lede">
              Tavus session (stub/live): <a href={tavusUrl}>{tavusUrl}</a>
            </p>
          ) : null}
        </div>
      ) : null}

      <AudionChatPanel
        personas={personas}
        personaId={personaId}
        onBusyChange={setBusy}
        initialConversation={initialConversation}
        initialDraft={initialDraft}
        shareProjectId={shareProjectId}
        allowConvert={!shareMode}
        composerLeading={composerLeading}
      />
    </AppShell>
  )
}
