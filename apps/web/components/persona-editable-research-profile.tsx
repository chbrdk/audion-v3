'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaMotivation } from '@audion-v3/contracts'
import { Button, EmptyState, Field, Input, Meter, MeterList, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { DerivePersonaAgentButton } from './derive-persona-agent-button'
import { IconDelete } from './nav-icons'

type Props = {
  personaId: string
  personaName?: string
  techLiteracy: number | null
  emotionalBaseline: string | null
  stressTriggers: string[]
  motivations: PersonaMotivation[]
  className?: string
}

export function PersonaEditableResearchProfile({
  personaId,
  personaName,
  techLiteracy,
  emotionalBaseline,
  stressTriggers,
  motivations,
  className,
}: Props) {
  const t = useT()
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

  const literacyPct = Math.round(literacy * 100)

  return (
    <Panel
      as="section"
      className={['stage-panel', 'audion-magazine-band', 'audion-persona-agent-panel', className]
        .filter(Boolean)
        .join(' ')}
    >
      <SectionChrome
        quiet
        title={t('personaEdit.researchProfile')}
        meta="UX agent"
        metaTone="accent"
        as="h3"
        action={
          <DerivePersonaAgentButton
            personaId={personaId}
            personaName={personaName}
            facet="researchProfile"
            disabled={saving}
          />
        }
      />
      <Text role="meta" as="p" className="audion-persona-agent-lede">
        Motivations, digital skill, and emotional baseline feed the journey agent&apos;s prior
        knowledge and feel channels.
      </Text>

      <MeterList aria-label={t('personaEdit.researchProfile')}>
        <Meter
          label={t('personaEdit.techLiteracy')}
          valueLabel={`${literacyPct}%`}
          value={literacyPct}
          disabled={saving}
          onChange={(n) => setLiteracy(n / 100)}
          onCommit={(n) => void persist({ techLiteracy: n / 100 })}
        />
      </MeterList>

      <Field label={t('personaEdit.emotionalBaseline')}>
        <Input
          block
          value={baseline}
          disabled={saving}
          placeholder="e.g. cautious-optimistic"
          onChange={(e) => setBaseline(e.target.value)}
          onBlur={() => void persist({ emotionalBaseline: baseline.trim() || null })}
        />
      </Field>

      <div className="audion-persona-agent-lists">
        <div>
          <Text role="label" as="h4" className="audion-persona-agent-list-title">
            {t('personaEdit.motivations')}
          </Text>
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
                    aria-label={`${t('common.remove')} ${index + 1}`}
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
            <EmptyState>{t('personaEdit.emptyMotivations')}</EmptyState>
          )}
          <Field label={t('personaEdit.addMotivation')}>
            <Input
              block
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
          <Text role="label" as="h4" className="audion-persona-agent-list-title">
            {t('personaEdit.stressTriggers')}
          </Text>
          {triggers.length ? (
            <ul>
              {triggers.map((item, index) => (
                <li key={`tr-${index}`}>
                  <span>{item}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`${t('common.remove')} ${index + 1}`}
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
            <EmptyState>{t('personaEdit.emptyStress')}</EmptyState>
          )}
          <Field label={t('personaEdit.addStressTrigger')}>
            <Input
              block
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
