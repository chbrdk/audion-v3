'use client'

import React, { useState } from 'react'
import type { PersonaDetail } from '@audion-v3/contracts'
import { Button, Panel, Text } from '@msqdx/ui'
import { useT } from '../lib/user-prefs'
import { EnrichPersonaButton } from './enrich-persona-button'
import { IconEdit } from './nav-icons'
import { PersonaEditDialog, type PersonaEditMode } from './persona-edit-dialog'

export function PersonaDetailActions({ persona }: { persona: PersonaDetail }) {
  const t = useT()
  const [mode, setMode] = useState<PersonaEditMode | null>(null)

  return (
    <>
      <EnrichPersonaButton personaId={persona.id} personaName={persona.name} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label={t('tiles.editPersona')}
        title={t('tiles.editPersona')}
        icon={<IconEdit />}
        onClick={() => setMode('edit')}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('tiles.fromTemplateAria')}
        title={t('tiles.fromTemplateAria')}
        onClick={() => setMode('template')}
      >
        {t('tiles.fromTemplate')}
      </Button>
      {mode != null ? (
        <PersonaEditDialog
          open
          onClose={() => setMode(null)}
          mode={mode}
          persona={persona}
        />
      ) : null}
    </>
  )
}

export function PersonaCreateButton({
  variant = 'button',
  projectId,
  nextIndex,
}: {
  variant?: 'button' | 'card' | 'row' | 'link'
  projectId?: string | null
  /** 1-based index shown on row variant (defaults to 1) */
  nextIndex?: number
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const num = String(Math.max(1, nextIndex ?? 1)).padStart(2, '0')
  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          className="audion-tg-card audion-tg-card--create"
          onClick={() => setOpen(true)}
        >
          <Panel as="div" variant="card" className="audion-tg-card-panel audion-tg-card-panel--create">
            <Text role="headline" as="span" className="audion-tg-card-title">
              {t('tiles.newPersona')}
            </Text>
            <p className="audion-tg-card-meta">
              <span>{t('tiles.newPersonaMeta')}</span>
            </p>
          </Panel>
        </button>
      ) : variant === 'row' ? (
        <button
          type="button"
          className="audion-editable-list-add-row"
          aria-label={t('tiles.addPersona')}
          onClick={() => setOpen(true)}
        >
          <span className="audion-magazine-list-num" aria-hidden>
            {num}
          </span>
          <span className="audion-editable-list-add-label">{t('tiles.addPersona')}</span>
        </button>
      ) : variant === 'link' ? (
        <button type="button" className="audion-link" onClick={() => setOpen(true)}>
          {t('tiles.addPersona')}
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t('tiles.createPersona')}
        </Button>
      )}
      {open ? (
        <PersonaEditDialog
          open
          onClose={() => setOpen(false)}
          mode="create"
          persona={null}
          defaultProjectId={projectId}
        />
      ) : null}
    </>
  )
}
