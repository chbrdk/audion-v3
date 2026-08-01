'use client'

import React, { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaJourneyBehavior, PersonaJourneyDimensions } from '@audion-v3/contracts'
import { Button, EmptyState, Field, Panel, SectionChrome, Textarea } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { IconDelete } from './nav-icons'

type Props = {
  personaId: string
  journeyBehavior: PersonaJourneyBehavior | null
  className?: string
}

const DIMENSIONS: Array<{
  key: keyof PersonaJourneyDimensions
  label: string
  hint: string
}> = [
  { key: 'riskAversion', label: 'Risk aversion', hint: 'Prefer safe / official paths' },
  { key: 'timePressure', label: 'Time pressure', hint: 'Speed vs careful scan' },
  { key: 'exploration', label: 'Exploration', hint: 'Side paths vs goal-driven' },
  { key: 'detailOrientation', label: 'Detail orientation', hint: 'Specs vs summaries' },
  { key: 'trustSkepticism', label: 'Trust skepticism', hint: 'Verify claims / marketing' },
  { key: 'accessibilityNeed', label: 'Accessibility need', hint: 'Simple / high-contrast flows' },
]

function emptyBehavior(): PersonaJourneyBehavior {
  return {
    dimensionOverrides: {
      riskAversion: 0.5,
      timePressure: 0.5,
      exploration: 0.5,
      detailOrientation: 0.5,
      trustSkepticism: 0.5,
      accessibilityNeed: 0.5,
    },
    dos: [],
    donts: [],
    heuristics: [],
    extraInstructions: null,
  }
}

function normalize(behavior: PersonaJourneyBehavior | null): PersonaJourneyBehavior {
  const base = emptyBehavior()
  if (!behavior) return base
  return {
    dimensionOverrides: {
      ...base.dimensionOverrides,
      ...(behavior.dimensionOverrides ?? {}),
    },
    dos: [...(behavior.dos ?? [])],
    donts: [...(behavior.donts ?? [])],
    heuristics: [...(behavior.heuristics ?? [])],
    extraInstructions: behavior.extraInstructions ?? null,
  }
}

export function PersonaEditableJourneyBehavior({
  personaId,
  journeyBehavior,
  className,
}: Props) {
  const router = useRouter()
  const baseId = useId()
  const [draft, setDraft] = useState(() => normalize(journeyBehavior))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDo, setNewDo] = useState('')
  const [newDont, setNewDont] = useState('')
  const [newHeuristic, setNewHeuristic] = useState('')

  useEffect(() => {
    setDraft(normalize(journeyBehavior))
    setError(null)
  }, [journeyBehavior, personaId])

  async function persist(next: PersonaJourneyBehavior) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyBehavior: next }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `Save failed (${response.status})`)
      }
      setDraft(normalize(next))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function setDim(key: keyof PersonaJourneyDimensions, value: number) {
    setDraft((prev) => ({
      ...prev,
      dimensionOverrides: {
        ...(prev.dimensionOverrides ?? {}),
        [key]: value,
      },
    }))
  }

  function commitDim(key: keyof PersonaJourneyDimensions, value: number) {
    const next: PersonaJourneyBehavior = {
      ...draft,
      dimensionOverrides: {
        ...(draft.dimensionOverrides ?? {}),
        [key]: value,
      },
    }
    setDraft(next)
    void persist(next)
  }

  function addList(kind: 'dos' | 'donts' | 'heuristics', value: string) {
    const label = value.trim()
    if (!label) return
    const next: PersonaJourneyBehavior = {
      ...draft,
      [kind]: [...(draft[kind] ?? []), label].slice(0, 8),
    }
    setDraft(next)
    void persist(next)
    if (kind === 'dos') setNewDo('')
    else if (kind === 'donts') setNewDont('')
    else setNewHeuristic('')
  }

  function removeList(kind: 'dos' | 'donts' | 'heuristics', index: number) {
    const next: PersonaJourneyBehavior = {
      ...draft,
      [kind]: (draft[kind] ?? []).filter((_, i) => i !== index),
    }
    setDraft(next)
    void persist(next)
  }

  return (
    <Panel as="section" className={className}>
      <SectionChrome quiet title="Journey behaviour" meta="UX agent" metaTone="accent" as="h3" />
      <p className="audion-muted" style={{ marginTop: '0.35rem', marginBottom: '0.85rem' }}>
        Soft controls for website inspect and study waves — dimensions, dos and donts guide
        navigation without hard click filters.
      </p>

      <ul className="audion-persona-journey-dims" aria-label="Journey dimensions">
        {DIMENSIONS.map((dim) => {
          const value = draft.dimensionOverrides?.[dim.key] ?? 0.5
          const pct = Math.round(value * 100)
          return (
            <li key={dim.key}>
              <label htmlFor={`${baseId}-${dim.key}`}>
                <span className="audion-persona-journey-dim-label">
                  {dim.label}
                  <span className="audion-muted"> · {pct}%</span>
                </span>
                <span className="audion-muted audion-persona-journey-dim-hint">{dim.hint}</span>
              </label>
              <input
                id={`${baseId}-${dim.key}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                disabled={saving}
                onChange={(e) => setDim(dim.key, Number(e.target.value) / 100)}
                onMouseUp={(e) =>
                  commitDim(dim.key, Number((e.target as HTMLInputElement).value) / 100)
                }
                onTouchEnd={(e) =>
                  commitDim(dim.key, Number((e.target as HTMLInputElement).value) / 100)
                }
                onBlur={(e) => commitDim(dim.key, Number(e.target.value) / 100)}
              />
            </li>
          )
        })}
      </ul>

      <div className="audion-persona-journey-lists">
        <div>
          <h4 className="audion-persona-journey-list-title">Dos</h4>
          {(draft.dos ?? []).length ? (
            <ul>
              {(draft.dos ?? []).map((item, index) => (
                <li key={`do-${index}`}>
                  <span>{item}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove do ${index + 1}`}
                    disabled={saving}
                    onClick={() => removeList('dos', index)}
                  >
                    <IconDelete />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No dos yet.</EmptyState>
          )}
          <Field label="Add do">
            <input
              value={newDo}
              onChange={(e) => setNewDo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addList('dos', newDo)
                }
              }}
              disabled={saving}
            />
          </Field>
        </div>

        <div>
          <h4 className="audion-persona-journey-list-title">Donts</h4>
          {(draft.donts ?? []).length ? (
            <ul>
              {(draft.donts ?? []).map((item, index) => (
                <li key={`dont-${index}`}>
                  <span>{item}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove dont ${index + 1}`}
                    disabled={saving}
                    onClick={() => removeList('donts', index)}
                  >
                    <IconDelete />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No donts yet.</EmptyState>
          )}
          <Field label="Add dont">
            <input
              value={newDont}
              onChange={(e) => setNewDont(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addList('donts', newDont)
                }
              }}
              disabled={saving}
            />
          </Field>
        </div>
      </div>

      <div className="audion-persona-journey-lists">
        <div>
          <h4 className="audion-persona-journey-list-title">Heuristics</h4>
          {(draft.heuristics ?? []).length ? (
            <ul>
              {(draft.heuristics ?? []).map((item, index) => (
                <li key={`h-${index}`}>
                  <span>{item}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove heuristic ${index + 1}`}
                    disabled={saving}
                    onClick={() => removeList('heuristics', index)}
                  >
                    <IconDelete />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No authored heuristics yet.</EmptyState>
          )}
          <Field label="Add heuristic">
            <input
              value={newHeuristic}
              onChange={(e) => setNewHeuristic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addList('heuristics', newHeuristic)
                }
              }}
              disabled={saving}
            />
          </Field>
        </div>
      </div>

      <Field label="Extra instructions">
        <Textarea
          value={draft.extraInstructions ?? ''}
          rows={3}
          disabled={saving}
          onChange={(e) =>
            setDraft({
              ...draft,
              extraInstructions: e.target.value,
            })
          }
          onBlur={() => void persist(draft)}
        />
      </Field>

      {error ? <p className="audion-form-error">{error}</p> : null}
      {saving ? <p className="audion-muted">Saving…</p> : null}
    </Panel>
  )
}
