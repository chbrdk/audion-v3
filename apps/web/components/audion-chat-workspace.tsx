'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  ChatConversationDetail,
  ChatMode,
  ChatModality,
  ChatShareMoodboard,
  ChatTavusSessionResponse,
  PersonaSummary,
  TargetGroupDetail,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import { Button, Field, IconMic, IconVideo, Text } from '@msqdx/ui'
import { AppShell } from './app-shell'
import { AudionChatPanel } from './audion-chat-panel'
import { AudionTargetGroupChatPanel } from './audion-target-group-chat-panel'
import { ChatHistoryFlyout } from './chat-history-flyout'
import { ChatMoodboardStrip } from './chat-moodboard-strip'
import { ChatShareFlyout } from './chat-share-flyout'
import { TavusVideoPanel } from './tavus-video-panel'
import { Select } from '../lib/msqdx-ui-client'
import { selectTgChatPersonas } from '../lib/chat/tg-ask-all'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type Props = {
  personas: PersonaSummary[]
  initialPersonaId: string | null
  initialConversation: ChatConversationDetail | null
  initialDraft?: string | null
  /** Public share token (projectId query). */
  shareProjectId?: string | null
  /** Optional moodboard tiles for strip (share or workspace). */
  moodboardTiles?: ChatShareMoodboard['tiles']
  targetGroups?: TargetGroupSummary[]
  initialTargetGroup?: TargetGroupDetail | null
  initialMode?: ChatMode
  /** Chrome-stripped iframe presentation. Spec: chat-embed.md */
  presentation?: 'default' | 'embed'
  /** Guest text-only vs full features (Tavus, inspect). Spec: chat-embed.md */
  embedCapabilities?: 'guest' | 'full'
  guestBudget?: {
    sessionId: string
    remainingTurns: number
    maxTurns: number
    maxChars: number
  } | null
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
  targetGroups = [],
  initialTargetGroup = null,
  initialMode,
  presentation = 'default',
  guestBudget = null,
  embedCapabilities = 'guest',
}: Props) {
  const t = useT()
  const router = useRouter()
  const shareMode = Boolean(shareProjectId)
  const modeOptions = useMemo(
    () => [
      { value: 'persona', label: t('chat.modePersona') },
      { value: 'target_group', label: t('chat.modeTargetGroup') },
    ],
    [t],
  )
  const embedMode = presentation === 'embed'
  const embedFullMode = embedMode && embedCapabilities === 'full'
  const [mode, setMode] = useState<ChatMode>(
    initialMode ?? (initialTargetGroup ? 'target_group' : 'persona'),
  )
  const [personaId, setPersonaId] = useState(
    initialPersonaId || initialConversation?.personaId || personas[0]?.id || '',
  )
  const [targetGroupId, setTargetGroupId] = useState(
    initialTargetGroup?.id || targetGroups[0]?.id || '',
  )
  const [busy, setBusy] = useState(false)
  const [modality, setModality] = useState<ChatModality>('text')
  const [tavusSession, setTavusSession] = useState<{
    conversationUrl: string
    conversationId: string | null
    meetingToken: string | null
  } | null>(null)
  const [tavusError, setTavusError] = useState<string | null>(null)
  const [tavusErrorCode, setTavusErrorCode] = useState<string | null>(null)
  const [tavusBusy, setTavusBusy] = useState(false)

  const personaOptions = useMemo(
    () => personas.map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
    [personas],
  )

  const tgOptions = useMemo(
    () => targetGroups.map((g) => ({ value: g.id, label: g.name })),
    [targetGroups],
  )

  const persona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId],
  )

  const projectIdForShare = shareProjectId || persona?.projectId || null
  const tgPersonaCount = selectTgChatPersonas(initialTargetGroup?.linkedPersonas).length
  const tgMode = !shareMode && mode === 'target_group'

  const toggleModality = useCallback((next: ChatModality) => {
    setModality((prev) => (prev === next ? 'text' : next))
  }, [])

  useEffect(() => {
    if (modality !== 'video' || tgMode || !personaId.trim()) {
      setTavusSession(null)
      return
    }
    if (shareMode && !embedFullMode) {
      setTavusSession(null)
      return
    }
    let cancelled = false
    async function start() {
      setTavusBusy(true)
      setTavusError(null)
      setTavusErrorCode(null)
      try {
        const res = await fetch(paths.routes.apiChatTavusSession, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId }),
        })
        const data = (await res.json().catch(() => null)) as
          | (ChatTavusSessionResponse & { error?: string; code?: string })
          | null
        if (!res.ok) {
          if (!cancelled) setTavusErrorCode(data?.code ?? null)
          throw new Error(data?.error || 'Tavus session failed')
        }
        if (!data?.conversationUrl) throw new Error('Tavus returned no conversation URL')
        if (!cancelled) {
          setTavusSession({
            conversationUrl: data.conversationUrl,
            conversationId: data.conversationId ?? null,
            meetingToken: data.meetingToken,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setTavusSession(null)
          setTavusError(e instanceof Error ? e.message : 'Tavus failed')
        }
      } finally {
        if (!cancelled) setTavusBusy(false)
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [modality, personaId, shareMode, tgMode, embedFullMode])

  function onModeChange(next: string) {
    const nextMode = next === 'target_group' ? 'target_group' : 'persona'
    setMode(nextMode)
    setBusy(false)
    if (nextMode === 'target_group') {
      const id = targetGroupId || targetGroups[0]?.id
      if (id) {
        setTargetGroupId(id)
        router.replace(paths.routes.chatTargetGroup(id))
      }
      return
    }
    router.replace(personaId ? paths.routes.chatPersona(personaId) : paths.routes.chat)
  }

  function onPersonaChange(id: string) {
    const next = id.trim()
    if (!next || next === personaId) return
    setPersonaId(next)
    setBusy(false)
    setModality('text')
    if (shareMode || embedMode) return
    router.replace(paths.routes.chatPersona(next))
  }

  function onTargetGroupChange(id: string) {
    setTargetGroupId(id)
    setBusy(false)
    router.replace(paths.routes.chatTargetGroup(id))
  }

  const composerLeading =
    tgMode || (embedMode && !embedFullMode) || (shareMode && !embedFullMode) ? null : (
    <div className="audion-chat-composer-actions" role="toolbar" aria-label={t('chat.modalityAria')}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={iconBtnClass(modality === 'voice')}
        icon={<IconMic />}
        aria-label={t('chat.voice')}
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
        aria-label={tavusBusy ? t('chat.startingVideo') : t('chat.video')}
        aria-pressed={modality === 'video'}
        disabled={busy || tavusBusy}
        onClick={() => toggleModality('video')}
      />
    </div>
  )

  const shareLeading = (
    <div className="audion-chat-topbar-leading">
      <Text role="label" className="audion-chat-share-label">
        {persona?.name || t('chat.sharedPersona')}
      </Text>
      <span className="audion-chat-share-badge">
        {embedFullMode
          ? t('chat.badgePersonaChat')
          : embedMode
            ? t('chat.badgeGuestChat')
            : t('chat.badgePublicShare')}
      </span>
      {embedMode && !embedFullMode ? null : (
        <ChatMoodboardStrip
          personaId={personaId}
          projectId={shareProjectId}
          tiles={moodboardTiles}
        />
      )}
    </div>
  )

  return (
    <AppShell
      presentation={presentation}
      leading={
        shareMode || embedMode ? (
          shareLeading
        ) : (
          <div className="audion-chat-topbar-leading">
            <Field
              label={t('chat.mode')}
              size="md"
              htmlFor="chat-mode"
              className="audion-chat-mode-field"
            >
              <Select
                id="chat-mode"
                options={modeOptions}
                value={mode}
                onChange={onModeChange}
                disabled={busy}
              />
            </Field>
            {tgMode ? (
              <>
                <Field
                  label={t('chat.fieldTargetGroup')}
                  size="md"
                  htmlFor="chat-target-group"
                  className="audion-chat-persona-field"
                >
                  <Select
                    id="chat-target-group"
                    options={tgOptions}
                    value={targetGroupId}
                    onChange={onTargetGroupChange}
                    disabled={busy || !tgOptions.length}
                  />
                </Field>
                {initialTargetGroup && targetGroupId === initialTargetGroup.id ? (
                  <Text role="label" className="audion-tg-chat-count">
                    {tgPersonaCount} persona{tgPersonaCount === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Field
                  label={t('chat.fieldPersona')}
                  size="md"
                  htmlFor="chat-persona"
                  className="audion-chat-persona-field"
                >
                  <Select
                    id="chat-persona"
                    options={personaOptions}
                    value={personaId}
                    onChange={onPersonaChange}
                    disabled={busy || !personaOptions.length}
                  />
                </Field>
                <div className="audion-chat-topbar-actions" role="group" aria-label={t('chat.linksAria')}>
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
              </>
            )}
          </div>
        )
      }
    >
      <h1 className="visually-hidden">
        {embedMode
          ? t('chat.titleEmbeddedChat')
          : shareMode
            ? t('chat.titleSharedChat')
            : tgMode
              ? t('chat.titleTgChat')
              : t('chat.titleChat')}
      </h1>

      {tgMode || (embedMode && !embedFullMode) ? null : modality === 'voice' &&
      (!shareMode || embedFullMode) ? (
        <p className="audion-edit-lede audion-chat-modality-note" role="status">
          {t('chatExtra.voiceStub')}
        </p>
      ) : null}

      {tgMode || (embedMode && !embedFullMode) ? null : modality === 'video' &&
      (!shareMode || embedFullMode) ? (
        <div className="audion-chat-tavus" role="status">
          {tavusBusy ? <p className="audion-edit-lede">{t('chat.startingVideo')}</p> : null}
          {tavusError ? <p className="audion-edit-error">{tavusError}</p> : null}
          {tavusErrorCode === 'TAVUS_REPLICA_MISSING' && personaId ? (
            <p className="audion-edit-lede">
              <Link href={paths.routes.personaDetail(personaId)} className="audion-link">
                {t('chatExtra.openPersonaProfile')}
              </Link>
              {' — '}
              {t('chatExtra.tavusReplicaHint')}
            </p>
          ) : null}
          {tavusSession ? (
            <TavusVideoPanel session={tavusSession} personaName={persona?.name} />
          ) : null}
        </div>
      ) : null}

      {tgMode && !embedMode ? (
        <AudionTargetGroupChatPanel
          targetGroup={
            initialTargetGroup && initialTargetGroup.id === targetGroupId
              ? initialTargetGroup
              : null
          }
          onBusyChange={setBusy}
        />
      ) : (
        <AudionChatPanel
          personas={personas}
          personaId={personaId}
          onBusyChange={setBusy}
          initialConversation={initialConversation}
          initialDraft={initialDraft}
          shareProjectId={shareProjectId}
          allowConvert={embedFullMode || (!shareMode && !embedMode)}
          composerLeading={composerLeading}
          guestBudget={guestBudget}
        />
      )}
    </AppShell>
  )
}
