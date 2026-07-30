'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  JourneyDetail,
  JourneyElementKind,
  JourneyPhase,
  JourneyPhaseElement,
} from '@audion-v3/contracts'
import { Button, Field, Input, Textarea } from '@msqdx/ui'
import { Dialog, TagInput } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { GeneratePhaseMomentsButton } from './generate-phase-moments-button'

function newPhaseId(): string {
  return `phase-${Date.now().toString(36)}`
}

function newElementId(): string {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function momentsFromPhase(phase: JourneyPhase | null): string[] {
  return (phase?.elements ?? []).map((el) => el.label)
}

function elementsFromMoments(
  labels: string[],
  previous: JourneyPhaseElement[],
): JourneyPhaseElement[] {
  const byLabel = new Map(previous.map((el) => [el.label, el]))
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, order) => {
      const prev = byLabel.get(label)
      return {
        id: prev?.id ?? newElementId(),
        kind: (prev?.kind ?? 'action') as JourneyElementKind,
        label,
        order,
      }
    })
}

export function JourneyPhaseEditDialog({
  open,
  onClose,
  mode,
  journey,
  phase,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  journey: JourneyDetail
  phase: JourneyPhase | null
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [moments, setMoments] = useState<string[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !phase) {
      setName('')
      setSummary('')
      setMoments([])
    } else {
      setName(phase.name)
      setSummary(phase.summary ?? '')
      setMoments(momentsFromPhase(phase))
    }
    setNameError(null)
    setSaveError(null)
  }, [open, mode, phase])

  async function onSave() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const previousElements = phase?.elements ?? []
      const elements = elementsFromMoments(moments, previousElements)
      const nextPhase: JourneyPhase = {
        id: mode === 'edit' && phase ? phase.id : newPhaseId(),
        name: name.trim(),
        order: mode === 'edit' && phase ? phase.order : journey.phases.length,
        summary: summary.trim() || null,
        elements,
      }
      const phases =
        mode === 'create'
          ? [...journey.phases, nextPhase]
          : journey.phases.map((p) => (p.id === nextPhase.id ? nextPhase : p))

      const response = await fetch(paths.routes.apiJourneyDetail(journey.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: journey.name,
          journeyType: journey.journeyType,
          status: journey.status,
          description: journey.description,
          targetGroupId: journey.targetGroupId,
          projectId: journey.projectId,
          phases,
        }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      onClose()
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isCreate = mode === 'create'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="audion-edit-dialog"
      title={isCreate ? 'New phase' : 'Edit phase'}
      actions={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="md" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : isCreate ? 'Add phase' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="audion-edit-form">
        <p className="audion-edit-lede">
          {isCreate
            ? 'Name the stage, write the focus, and list the moments that happen here.'
            : 'Update this phase’s focus and moments.'}
        </p>

        <Field
          label="Name"
          size="md"
          error={nameError ?? undefined}
          htmlFor="phase-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="phase-name"
            block
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(null)
            }}
            placeholder="Phase name"
          />
        </Field>

        <Field label="Focus" size="md" htmlFor="phase-summary" className="audion-edit-field">
          <Textarea
            id="phase-summary"
            block
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What should this phase clarify or unlock?"
          />
        </Field>

        <Field label="Moments" size="md" htmlFor="phase-moments" className="audion-edit-field">
          <div className="audion-phase-moments-field">
            {mode === 'edit' && phase ? (
              <GeneratePhaseMomentsButton
                journeyId={journey.id}
                phase={phase}
                onApplied={setMoments}
              />
            ) : null}
            <TagInput
              id="phase-moments"
              size="md"
              value={moments}
              onChange={setMoments}
              placeholder="Add moment…"
            />
          </div>
        </Field>

        {saveError ? (
          <p className="audion-edit-error" role="alert">
            {saveError}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
