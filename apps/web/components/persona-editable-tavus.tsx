'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Panel, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'

type Props = {
  personaId: string
  tavusReplicaId: string | null
  tavusPersonaId: string | null
  className?: string
}

export function PersonaEditableTavus({
  personaId,
  tavusReplicaId,
  tavusPersonaId,
  className,
}: Props) {
  const router = useRouter()
  const [replicaId, setReplicaId] = useState(tavusReplicaId ?? '')
  const [palId, setPalId] = useState(tavusPersonaId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReplicaId(tavusReplicaId ?? '')
    setPalId(tavusPersonaId ?? '')
    setError(null)
  }, [personaId, tavusReplicaId, tavusPersonaId])

  async function persist() {
    const nextReplica = replicaId.trim()
    const nextPal = palId.trim()
    const currentReplica = (tavusReplicaId ?? '').trim()
    const currentPal = (tavusPersonaId ?? '').trim()
    if (nextReplica === currentReplica && nextPal === currentPal) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tavusReplicaId: nextReplica || null,
          tavusPersonaId: nextPal || null,
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
        ). Required to start a video call in chat. PAL ID is optional.
      </p>
      <div className="audion-persona-tavus-fields">
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
        <Field label="Tavus PAL ID (optional)" htmlFor="persona-tavus-pal" size="md">
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
