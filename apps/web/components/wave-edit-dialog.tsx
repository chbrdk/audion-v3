'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UxWaveDetail, UxWaveWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Textarea, WizardSteps } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { TOOL_URL, HOME_URL } from '../lib/fixtures/ux-studies'

const STEPS = [
  { id: 'wave', label: 'Wave' },
  { id: 'seed', label: 'Seed run' },
]

const URL_OPTIONS = [
  { value: 'tool', label: 'Produktkombinationen tool' },
  { value: 'home', label: 'Bosch eBike home' },
]

const PERSONA_OPTIONS = [
  { value: 'persona-alex-nachruester', label: 'Alex Nachrüster' },
  { value: 'persona-sam-kaufinteressent', label: 'Sam Kaufinteressent' },
  { value: 'persona-alex-morgan', label: 'Alex Morgan' },
]

const SEGMENT_OPTIONS = [
  { value: 'owner_upgrade', label: 'Owner upgrade' },
  { value: 'purchase_intent', label: 'Purchase intent' },
  { value: 'explorer', label: 'Explorer' },
]

function resolveUrl(key: string): string {
  return key === 'home' ? HOME_URL : TOOL_URL
}

export function WaveEditDialog({
  open,
  onClose,
  studyId,
  defaultTargetUrlKey,
}: {
  open: boolean
  onClose: () => void
  studyId: string
  defaultTargetUrlKey?: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [waveKey, setWaveKey] = useState('')
  const [urlKey, setUrlKey] = useState(
    defaultTargetUrlKey?.includes('home') ? 'home' : 'tool',
  )
  const [personaId, setPersonaId] = useState(PERSONA_OPTIONS[0]!.value)
  const [segment, setSegment] = useState(SEGMENT_OPTIONS[0]!.value)
  const [task, setTask] = useState('Explore the page and state purpose + first friction.')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setWaveKey('')
    setUrlKey(defaultTargetUrlKey?.includes('home') ? 'home' : 'tool')
    setPersonaId(PERSONA_OPTIONS[0]!.value)
    setSegment(SEGMENT_OPTIONS[0]!.value)
    setTask('Explore the page and state purpose + first friction.')
    setKeyError(null)
    setSaveError(null)
  }, [open, defaultTargetUrlKey])

  async function onSave() {
    if (!waveKey.trim()) {
      setKeyError('Wave key is required')
      setStep(0)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const personaLabel =
        PERSONA_OPTIONS.find((p) => p.value === personaId)?.label ?? personaId
      const payload: UxWaveWritePayload = {
        waveKey: waveKey.trim(),
        status: 'draft',
        runs: [
          {
            runKey: `seed-${segment}`,
            url: resolveUrl(urlKey),
            task: task.trim() || 'Complete the UX task',
            personaId,
            personaName: personaLabel,
            segment,
            maxSteps: 40,
          },
        ],
      }
      const response = await fetch(paths.routes.apiStudyWaves(studyId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const saved = (await response.json()) as UxWaveDetail
      onClose()
      router.push(paths.routes.studyWaveDetail(studyId, saved.id))
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="audion-edit-dialog"
      title="New wave"
      actions={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {step > 0 ? (
            <Button variant="subtle" size="md" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button size="md" onClick={() => setStep((s) => s + 1)} disabled={saving}>
              Next
            </Button>
          ) : (
            <Button size="md" onClick={() => void onSave()} disabled={saving}>
              {saving ? 'Creating…' : 'Create wave'}
            </Button>
          )}
        </>
      }
    >
      <div className="audion-edit-form">
        <WizardSteps steps={STEPS} activeIndex={step} onStepSelect={setStep} />
        <p className="audion-edit-lede">
          Seed one run plan (URL, persona, segment, task). Start orchestration from the wave page.
        </p>

        {step === 0 ? (
          <Field
            label="Wave key"
            size="md"
            error={keyError ?? undefined}
            htmlFor="wave-key"
            className="audion-edit-field audion-edit-field--hero"
          >
            <Input
              id="wave-key"
              block
              value={waveKey}
              onChange={(e) => {
                setWaveKey(e.target.value)
                if (keyError) setKeyError(null)
              }}
              placeholder="e.g. 2026-08-nav-retest"
            />
          </Field>
        ) : (
          <>
            <Field label="URL" size="md" htmlFor="wave-url" className="audion-edit-field">
              <Select
                id="wave-url"
                options={URL_OPTIONS}
                value={urlKey}
                onChange={setUrlKey}
              />
            </Field>
            <Field label="Persona" size="md" htmlFor="wave-persona" className="audion-edit-field">
              <Select
                id="wave-persona"
                options={PERSONA_OPTIONS}
                value={personaId}
                onChange={setPersonaId}
              />
            </Field>
            <Field label="Segment" size="md" htmlFor="wave-segment" className="audion-edit-field">
              <Select
                id="wave-segment"
                options={SEGMENT_OPTIONS}
                value={segment}
                onChange={setSegment}
              />
            </Field>
            <Field label="Task" size="md" htmlFor="wave-task" className="audion-edit-field">
              <Textarea
                id="wave-task"
                block
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
            </Field>
          </>
        )}

        {saveError ? (
          <p className="audion-edit-error" role="alert">
            {saveError}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}

export function WaveCreateButton({
  studyId,
  defaultTargetUrlKey,
}: {
  studyId: string
  defaultTargetUrlKey?: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        New wave
      </Button>
      {open ? (
        <WaveEditDialog
          open
          onClose={() => setOpen(false)}
          studyId={studyId}
          defaultTargetUrlKey={defaultTargetUrlKey}
        />
      ) : null}
    </>
  )
}
