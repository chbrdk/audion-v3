'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaMotivation } from '@audion-v3/contracts'
import { Button, EmptyState, Field, Panel, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { IconDelete } from './nav-icons'

type Props = {
  personaId: string
  techLiteracy: number | null
  emotionalBaseline: string | null
  stressTriggers: string[]
  motivations: PersonaMotivation[]
  className?: string
}

export function PersonaEditableResearchProfile({
  personaId,
  techLiteracy,
  emotionalBaseline,
  stressTriggers,
  motivations,
  className,
}: Props) {
  const router = useRouter()
  const [literacy, setLiteracy] = useState(techLiteracy ?? 0.5)
  const [baseline, setBaseline] = useState(emotionalBaseline ?? '')
  const [triggers, setTriggers] = useState(stressTriggers)
  const [mots, setMots] = useState(motivations)
  const [newTrigger, setNewTrigger] = useState('')
  const [newMot, setNewMot] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLiteracy(techLiteracy ?? 0.5)
    setBaseline(emotionalBaseline ?? '')
    setTriggers(stressTriggers)
    setMots(motivations)
    setError(null)
  }, [personaId, techLiteracy, emotionalBaseline, stressTriggers, motivations])

  async function persist(patch: Record<string, unknown>) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
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
    <Panel as="section" className={className}>
      <SectionChrome quiet title="Research profile" meta="UX agent" metaTone="accent" as="h3" />
      <p className="audion-muted" style={{ marginTop: '0.35rem', marginBottom: '0.85rem' }}>
        Motivations, digital skill, and emotional baseline feed the journey agent&apos;s prior
        knowledge and feel channels.
      </p>

      <Field label={`Tech literacy · ${Math.round(literacy * 100)}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(literacy * 100)}
          disabled={saving}
          onChange={(e) => setLiteracy(Number(e.target.value) / 100)}
          onMouseUp={() => void persist({ techLiteracy: literacy })}
          onBlur={() => void persist({ techLiteracy: literacy })}
        />
      </Field>

      <Field label="Emotional baseline">
        <input
          value={baseline}
          disabled={saving}
          placeholder="e.g. cautious-optimistic"
          onChange={(e) => setBaseline(e.target.value)}
          onBlur={() => void persist({ emotionalBaseline: baseline.trim() || null })}
        />
      </Field>

      <div className="audion-persona-journey-lists">
        <div>
          <h4 className="audion-persona-journey-list-title">Motivations</h4>
          {mots.length ? (
            <ul>
              {mots.map((m, index) => (
                <li key={`mot-${index}`}>
                  <span>
                    {m.label}
                    {m.type ? ` · ${m.type}` : ''}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove motivation ${index + 1}`}
                    disabled={saving}
                    onClick={() => {
                      const next = mots.filter((_, i) => i !== index)
                      setMots(next)
                      void persist({ motivations: next })
                    }}
                  >
                    <IconDelete />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No motivations yet.</EmptyState>
          )}
          <Field label="Add motivation">
            <input
              value={newMot}
              disabled={saving}
              onChange={(e) => setNewMot(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                const label = newMot.trim()
                if (!label) return
                const next = [...mots, { label, type: null }].slice(0, 12)
                setMots(next)
                setNewMot('')
                void persist({ motivations: next })
              }}
            />
          </Field>
        </div>

        <div>
          <h4 className="audion-persona-journey-list-title">Stress triggers</h4>
          {triggers.length ? (
            <ul>
              {triggers.map((item, index) => (
                <li key={`tr-${index}`}>
                  <span>{item}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove trigger ${index + 1}`}
                    disabled={saving}
                    onClick={() => {
                      const next = triggers.filter((_, i) => i !== index)
                      setTriggers(next)
                      void persist({ stressTriggers: next })
                    }}
                  >
                    <IconDelete />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No stress triggers yet.</EmptyState>
          )}
          <Field label="Add stress trigger">
            <input
              value={newTrigger}
              disabled={saving}
              onChange={(e) => setNewTrigger(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                const label = newTrigger.trim()
                if (!label) return
                const next = [...triggers, label].slice(0, 12)
                setTriggers(next)
                setNewTrigger('')
                void persist({ stressTriggers: next })
              }}
            />
          </Field>
        </div>
      </div>

      {error ? <p className="audion-form-error">{error}</p> : null}
      {saving ? <p className="audion-muted">Saving…</p> : null}
    </Panel>
  )
}
