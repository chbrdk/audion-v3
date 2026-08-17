'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Panel, SectionChrome, ToggleGroup } from '@msqdx/ui'
import { paths } from '../lib/paths'
import {
  parseTavusLanguage,
  resolveTavusLanguage,
  type TavusLanguageCode,
  type TavusLanguageSource,
} from '../lib/tavus/language'

type Props = {
  personaId: string
  tavusReplicaId: string | null
  tavusPersonaId: string | null
  tavusLanguage: TavusLanguageCode | null
  bio?: string | null
  location?: string | null
  headlineDe?: string | null
  profileDe?: TavusLanguageSource['profileDe']
  className?: string
}

const LANGUAGE_OPTIONS = paths.tavusLanguageChoices.map((value) => ({
  value,
  label: value === 'de' ? 'Deutsch' : 'English',
}))

export function PersonaEditableTavus({
  personaId,
  tavusReplicaId,
  tavusPersonaId,
  tavusLanguage,
  bio,
  location,
  headlineDe,
  profileDe,
  className,
}: Props) {
  const router = useRouter()
  const inferred = resolveTavusLanguage({ tavusLanguage, bio, location, headlineDe, profileDe })
  const [replicaId, setReplicaId] = useState(tavusReplicaId ?? '')
  const [palId, setPalId] = useState(tavusPersonaId ?? '')
  const [language, setLanguage] = useState<TavusLanguageCode>(inferred)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReplicaId(tavusReplicaId ?? '')
    setPalId(tavusPersonaId ?? '')
    setLanguage(resolveTavusLanguage({ tavusLanguage, bio, location, headlineDe, profileDe }))
    setError(null)
  }, [personaId, tavusReplicaId, tavusPersonaId, tavusLanguage, bio, location, headlineDe, profileDe])

  async function persist(nextLanguage = language) {
    const nextReplica = replicaId.trim()
    const nextPal = palId.trim()
    const currentReplica = (tavusReplicaId ?? '').trim()
    const currentPal = (tavusPersonaId ?? '').trim()
    const currentLanguage = parseTavusLanguage(tavusLanguage) ?? inferred
    if (
      nextReplica === currentReplica &&
      nextPal === currentPal &&
      nextLanguage === currentLanguage &&
      tavusLanguage
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
          tavusReplicaId: nextReplica || null,
          tavusPersonaId: nextPal || null,
          tavusLanguage: nextLanguage,
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
      <SectionChrome quiet title="Video (Tavus)" />
      <p className="audion-edit-lede">
        Replica ID from the Tavus dashboard (starts with <code>r</code>, e.g. <code>r5e781e37a8d</code>
        ). Required for video. Saving a replica syncs a Tavus PAL from this magazine (name, bio, goals,
        style). PAL ID is filled in automatically; paste one only to reuse an existing PAL.
      </p>
      <div className="audion-persona-tavus-fields">
        <Field label="Spoken language" size="md">
          <ToggleGroup
            aria-label="Spoken language"
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(value) => {
              const next = parseTavusLanguage(value) ?? language
              setLanguage(next)
              void persist(next)
            }}
          />
        </Field>
        <Field label="Tavus replica ID" htmlFor="persona-tavus-replica" size="md">
          <Input
            id="persona-tavus-replica"
            block
            value={replicaId}
            placeholder="r5e781e37a8d"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setReplicaId(event.target.value)}
            onBlur={() => void persist()}
          />
        </Field>
        <Field label="Tavus PAL ID (synced)" htmlFor="persona-tavus-pal" size="md">
          <Input
            id="persona-tavus-pal"
            block
            value={palId}
            placeholder="p…"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setPalId(event.target.value)}
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
        {saving ? 'Saving…' : 'Save Tavus IDs'}
      </Button>
    </Panel>
  )
}
