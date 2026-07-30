'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UxStudyDetail, UxStudyStatus, UxStudyWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Panel, Text, Textarea, WizardSteps } from '@msqdx/ui'
import { Dialog, Select, TagInput } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { EBM_HYPOTHESES } from '../lib/fixtures/ux-studies'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'hypotheses', label: 'Hypotheses' },
]

function emptyPayload(): UxStudyWritePayload {
  return {
    name: '',
    status: 'draft',
    description: '',
    projectId: null,
    sourceGuide: '',
    targetUrlKey: 'bosch.ebike.produktkombinationen',
    hypothesisTemplates: EBM_HYPOTHESES.map((h) => ({ ...h })),
  }
}

function templatesToTags(
  templates: Array<{ id: string; statement: string }>,
): string[] {
  return templates.map((h) => `${h.id}: ${h.statement}`)
}

function tagsToTemplates(tags: string[]): Array<{ id: string; statement: string }> {
  return tags.map((tag, i) => {
    const match = tag.match(/^(H\d+)\s*:\s*(.+)$/i)
    if (match) return { id: match[1]!.toUpperCase(), statement: match[2]!.trim() }
    return { id: `H${i + 1}`, statement: tag.trim() }
  })
}

export function StudyEditDialog({
  open,
  onClose,
  mode,
  study,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  study: UxStudyDetail | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<UxStudyWritePayload>(emptyPayload())
  const [hypTags, setHypTags] = useState<string[]>(templatesToTags(EBM_HYPOTHESES))
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    if (mode === 'create' || !study) {
      const empty = emptyPayload()
      setForm(empty)
      setHypTags(templatesToTags(empty.hypothesisTemplates ?? []))
    } else {
      setForm({
        name: study.name,
        status: study.status,
        description: study.description ?? '',
        projectId: study.projectId,
        sourceGuide: study.sourceGuide ?? '',
        targetUrlKey: study.targetUrlKey ?? '',
        hypothesisTemplates: study.hypothesisTemplates,
      })
      setHypTags(templatesToTags(study.hypothesisTemplates))
    }
    setNameError(null)
    setSaveError(null)
  }, [open, mode, study])

  async function onSave() {
    if (!form.name.trim()) {
      setNameError('Name is required')
      setStep(0)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload: UxStudyWritePayload = {
        ...form,
        name: form.name.trim(),
        description: form.description || null,
        sourceGuide: form.sourceGuide || null,
        targetUrlKey: form.targetUrlKey || null,
        projectId: form.projectId || null,
        hypothesisTemplates: tagsToTemplates(hypTags),
      }
      const url =
        mode === 'create' ? paths.routes.apiStudies : paths.routes.apiStudyDetail(study!.id)
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const saved = (await response.json()) as UxStudyDetail
      onClose()
      router.push(paths.routes.studyDetail(saved.id))
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
      title={isCreate ? 'New study' : 'Edit study'}
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
              {saving ? 'Saving…' : isCreate ? 'Create' : 'Save'}
            </Button>
          )}
        </>
      }
    >
      <div className="audion-edit-form">
        <WizardSteps steps={STEPS} activeIndex={step} onStepSelect={setStep} />
        <p className="audion-edit-lede">
          {isCreate
            ? 'Name the study, target URL key, and H1–H5 templates — waves are added next.'
            : 'Update study brief and hypothesis templates.'}
        </p>

        {step === 0 ? (
          <>
            <Field
              label="Name"
              size="md"
              error={nameError ?? undefined}
              htmlFor="study-name"
              className="audion-edit-field audion-edit-field--hero"
            >
              <Input
                id="study-name"
                block
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                  if (nameError) setNameError(null)
                }}
                placeholder="Study name"
              />
            </Field>
            <Field label="Status" size="md" htmlFor="study-status" className="audion-edit-field">
              <Select
                id="study-status"
                options={STATUS_OPTIONS}
                value={form.status ?? 'draft'}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as UxStudyStatus }))
                }
              />
            </Field>
            <Field
              label="Target URL key"
              size="md"
              htmlFor="study-url-key"
              className="audion-edit-field"
            >
              <Input
                id="study-url-key"
                block
                value={form.targetUrlKey ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, targetUrlKey: e.target.value }))}
                placeholder="bosch.ebike.produktkombinationen"
              />
            </Field>
            <Field
              label="Source guide"
              size="md"
              htmlFor="study-guide"
              className="audion-edit-field"
            >
              <Input
                id="study-guide"
                block
                value={form.sourceGuide ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceGuide: e.target.value }))}
                placeholder="Leitfaden reference"
              />
            </Field>
            <Field
              label="Description"
              size="md"
              htmlFor="study-description"
              className="audion-edit-field"
            >
              <Textarea
                id="study-description"
                block
                rows={3}
                value={form.description ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short study brief"
              />
            </Field>
          </>
        ) : (
          <Field
            label="Hypothesis templates (H1–H5)"
            size="md"
            htmlFor="study-hyps"
            className="audion-edit-field"
          >
            <TagInput
              id="study-hyps"
              size="md"
              value={hypTags}
              onChange={setHypTags}
              placeholder="H1: Statement…"
            />
          </Field>
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

export function StudyCreateButton({
  variant = 'button',
}: {
  variant?: 'button' | 'card'
}) {
  const [open, setOpen] = useState(false)
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
              New study
            </Text>
            <p className="audion-tg-card-meta">
              <span>Study → Wave → Evaluate</span>
            </p>
          </Panel>
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          New study
        </Button>
      )}
      {open ? (
        <StudyEditDialog open onClose={() => setOpen(false)} mode="create" study={null} />
      ) : null}
    </>
  )
}
