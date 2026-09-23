'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChatVideoCallProvider } from '@audion-v3/contracts'
import { Button, Field, Input, Panel, SectionChrome, ToggleGroup } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { parseVideoCallProvider } from '../lib/video-call/provider'
import { useT } from '../lib/user-prefs'

type Props = {
  personaId: string
  beyAvatarId: string | null
  beyAgentId: string | null
  videoCallProvider: ChatVideoCallProvider | null
  className?: string
}

export function PersonaEditableBey({
  personaId,
  beyAvatarId,
  beyAgentId,
  videoCallProvider,
  className,
}: Props) {
  const t = useT()
  const router = useRouter()
  const [avatarId, setAvatarId] = useState(beyAvatarId ?? '')
  const [agentId, setAgentId] = useState(beyAgentId ?? '')
  const [provider, setProvider] = useState<ChatVideoCallProvider | 'auto'>(
    videoCallProvider ?? 'auto',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerOptions = [
    { value: 'auto', label: t('personaEdit.videoProviderAuto') },
    { value: 'bey', label: 'Beyond Presence' },
    { value: 'tavus', label: 'Tavus' },
  ]

  useEffect(() => {
    setAvatarId(beyAvatarId ?? '')
    setAgentId(beyAgentId ?? '')
    setProvider(videoCallProvider ?? 'auto')
    setError(null)
  }, [personaId, beyAvatarId, beyAgentId, videoCallProvider])

  async function persist(nextProvider = provider) {
    const nextAvatar = avatarId.trim()
    const nextAgent = agentId.trim()
    const currentAvatar = (beyAvatarId ?? '').trim()
    const currentAgent = (beyAgentId ?? '').trim()
    const currentProvider = videoCallProvider ?? 'auto'
    if (
      nextAvatar === currentAvatar &&
      nextAgent === currentAgent &&
      nextProvider === currentProvider
    ) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beyAvatarId: nextAvatar || null,
          beyAgentId: nextAgent || null,
          videoCallProvider:
            nextProvider === 'auto' ? null : parseVideoCallProvider(nextProvider),
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `Save failed (${response.status})`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel
      as="section"
      className={['stage-panel', 'audion-magazine-band', className].filter(Boolean).join(' ')}
    >
      <SectionChrome quiet title={t('personaEdit.videoBey')} />
      <p className="audion-edit-lede">{t('personaEdit.videoBeyLede')}</p>
      <div className="audion-persona-tavus-fields">
        <Field label={t('personaEdit.videoProvider')} size="md">
          <ToggleGroup
            aria-label={t('personaEdit.videoProvider')}
            options={providerOptions}
            value={provider}
            onChange={(value) => {
              const next =
                value === 'bey' || value === 'tavus' || value === 'auto' ? value : provider
              setProvider(next)
              void persist(next)
            }}
          />
        </Field>
        <Field label={t('personaEdit.beyAvatarId')} htmlFor="persona-bey-avatar" size="md">
          <Input
            id="persona-bey-avatar"
            block
            value={avatarId}
            placeholder="01234567-89ab-…"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setAvatarId(event.target.value)}
            onBlur={() => void persist()}
          />
        </Field>
        <Field label={t('personaEdit.beyAgentId')} htmlFor="persona-bey-agent" size="md">
          <Input
            id="persona-bey-agent"
            block
            value={agentId}
            placeholder="agent id (auto)"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setAgentId(event.target.value)}
            onBlur={() => void persist()}
          />
        </Field>
      </div>
      {error ? <p className="audion-edit-error">{error}</p> : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={saving}
        onClick={() => void persist()}
      >
        {saving ? t('common.saving') : t('personaEdit.saveBeyIds')}
      </Button>
    </Panel>
  )
}
