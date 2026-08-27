'use client'

import React, { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaJourneyBehavior, PersonaJourneyDimensions } from '@audion-v3/contracts'
import { Button, EmptyState, Field, Input, Meter, MeterList, Panel, SectionChrome, Text, Textarea } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { DerivePersonaAgentButton } from './derive-persona-agent-button'
import { IconDelete } from './nav-icons'

type Props = {
  personaId: string
  personaName?: string
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
  personaName,
  journeyBehavior,
  className,
}: Props) {
  const t = useT()
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
    <Panel
      as="section"
      className={['stage-panel', 'audion-magazine-band', 'audion-persona-agent-panel', className]
        .filter(Boolean)
        .join(' ')}
    >
      <SectionChrome
        quiet
        title={t('personaEdit.journeyBehaviour')}
        meta="UX agent"
        metaTone="accent"
        as="h3"
        action={
          <DerivePersonaAgentButton
            personaId={personaId}
            personaName={personaName}
            facet="journeyBehavior"
            disabled={saving}
          />
        }
      />
      <Text role="meta" as="p" className="audion-persona-agent-lede">
        Soft controls for website inspect and study waves — dimensions, dos and donts guide
        navigation without hard click filters.
      </Text>

      <MeterList aria-label={t('personaEdit.journeyBehaviour')}>
        {DIMENSIONS.map((dim) => {
          const value = draft.dimensionOverrides?.[dim.key] ?? 0.5
          const pct = Math.round(value * 100)
          const label =
            dim.key === 'riskAversion' ? t('personaEdit.riskAversion') : dim.label
          return (
            <Meter
              key={dim.key}
              id={`${baseId}-${dim.key}`}
              label={label}
              hint={` · ${dim.hint}`}
              valueLabel={`${pct}%`}
              value={pct}
              disabled={saving}
              onChange={(n) => setDim(dim.key, n / 100)}
              onCommit={(n) => commitDim(dim.key, n / 100)}
            />
          )
        })}
      </MeterList>

      <div className="audion-persona-agent-lists">
        <div>
          <Text role="label" as="h4" className="audion-persona-agent-list-title">
            Dos
          </Text>
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
          <Field label={t('personaEdit.addDo')}>
            <Input
              block
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
          <Text role="label" as="h4" className="audion-persona-agent-list-title">
            Donts
          </Text>
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
          <Field label={t('personaEdit.addDont')}>
            <Input
              block
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

        <div>
          <Text role="label" as="h4" className="audion-persona-agent-list-title">
            Heuristics
          </Text>
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
          <Field label={t('personaEdit.addHeuristic')}>
            <Input
              block
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

      <Field label={t('personaEdit.extraInstructions')}>
        <Textarea
          value={draft.extraInstructions ?? ''}
          rows={3}
          block
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

      {error ? (
        <p className="audion-form-error" role="alert">
          {error}
        </p>
      ) : null}
      {saving ? (
        <Text role="meta" as="p">
          {t('common.saving')}
        </Text>
      ) : null}
    </Panel>
  )
}
