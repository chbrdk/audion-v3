'use client'

import React, { useState } from 'react'
import type { PersonaDetail } from '@audion-v3/contracts'
import { Button, Panel, Text } from '@msqdx/ui'
import { EnrichPersonaButton } from './enrich-persona-button'
import { IconEdit } from './nav-icons'
import { PersonaEditDialog, type PersonaEditMode } from './persona-edit-dialog'

export function PersonaDetailActions({ persona }: { persona: PersonaDetail }) {
  const [mode, setMode] = useState<PersonaEditMode | null>(null)

  return (
    <>
      <div className="audion-magazine-topbar-actions">
        <EnrichPersonaButton personaId={persona.id} personaName={persona.name} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="audion-edit-icon-btn"
          aria-label="Edit persona"
          title="Edit persona"
          icon={<IconEdit />}
          onClick={() => setMode('edit')}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Create from template"
          title="Create from template"
          onClick={() => setMode('template')}
        >
          From template
        </Button>
      </div>
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
          <Panel as="div" className="audion-tg-card-panel audion-tg-card-panel--create">
            <Text role="headline" as="span" className="audion-tg-card-title">
              New persona
            </Text>
            <p className="audion-tg-card-meta">
              <span>Start a profile brief</span>
            </p>
          </Panel>
        </button>
      ) : variant === 'row' ? (
        <button
          type="button"
          className="audion-editable-list-add-row"
          aria-label="Add persona"
          onClick={() => setOpen(true)}
        >
          <span className="audion-magazine-list-num" aria-hidden>
            {num}
          </span>
          <span className="audion-editable-list-add-label">Add persona</span>
        </button>
      ) : variant === 'link' ? (
        <button type="button" className="audion-link" onClick={() => setOpen(true)}>
          Add one
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          Create persona
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
