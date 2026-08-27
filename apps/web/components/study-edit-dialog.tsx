'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UxStudyDetail, UxStudyStatus, UxStudyWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Panel, Text, Textarea, LedeStrip } from '@msqdx/ui'
import { Dialog, Select, TagInput } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { EBM_HYPOTHESES } from '../lib/fixtures/ux-studies'
import type { UxScenarioPackSummary, UxStudyFromPackResult } from '@audion-v3/contracts'

const BLANK_PACK = '__blank__'

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
  const t = useT()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<UxStudyWritePayload>(emptyPayload())
  const [hypTags, setHypTags] = useState<string[]>(templatesToTags(EBM_HYPOTHESES))
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [packs, setPacks] = useState<UxScenarioPackSummary[]>([])
  const [packId, setPackId] = useState(BLANK_PACK)

  const statusOptions = [
    { value: 'draft', label: t('dialogs.statusDraft') },
    { value: 'active', label: t('dialogs.statusActive') },
    { value: 'archived', label: t('dialogs.statusArchived') },
  ]

  const steps = [
    { id: 'basics', label: t('dialogs.studyStepBasics') },
    { id: 'hypotheses', label: t('dialogs.studyStepHypotheses') },
  ]

  useEffect(() => {
    if (!open) return
    setStep(0)
    if (mode === 'create' || !study) {
      const empty = emptyPayload()
      setForm(empty)
      setHypTags(templatesToTags(empty.hypothesisTemplates ?? []))
      setPackId(BLANK_PACK)
      void fetch(paths.routes.apiStudiesFromPack)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { items?: UxScenarioPackSummary[] } | null) => {
          if (data?.items?.length) setPacks(data.items)
        })
        .catch(() => undefined)
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
      setPackId(BLANK_PACK)
    }
    setNameError(null)
    setSaveError(null)
  }, [open, mode, study])

  async function onSave() {
    if (!form.name.trim() && packId === BLANK_PACK) {
      setNameError(t('dialogs.nameRequired'))
      setStep(0)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (mode === 'create' && packId !== BLANK_PACK) {
        const response = await fetch(paths.routes.apiStudiesFromPack, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId,
            name: form.name.trim() || undefined,
            projectId: form.projectId || null,
          }),
        })
        if (!response.ok) {
          const err = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `Save failed (${response.status})`)
        }
        const saved = (await response.json()) as UxStudyFromPackResult
        onClose()
        router.push(paths.routes.studyWaveDetail(saved.study.id, saved.wave.id))
        router.refresh()
        return
      }

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
      setSaveError(error instanceof Error ? error.message : t('dialogs.saveFailed'))
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
      title={isCreate ? t('dialogs.studyNewTitle') : t('dialogs.studyEditTitle')}
      actions={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          {step > 0 ? (
            <Button variant="subtle" size="md" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              {t('common.back')}
            </Button>
          ) : null}
          {step < steps.length - 1 && packId === BLANK_PACK ? (
            <Button size="md" onClick={() => setStep((s) => s + 1)} disabled={saving}>
              {t('common.next')}
            </Button>
          ) : (
            <Button size="md" onClick={() => void onSave()} disabled={saving}>
              {saving
                ? t('common.saving')
                : isCreate && packId !== BLANK_PACK
                  ? t('dialogs.createFromPack')
                  : isCreate
                    ? t('common.create')
                    : t('common.save')}
            </Button>
          )}
        </>
      }
    >
      <div className="audion-edit-form">
        <LedeStrip variant="steps" steps={steps} activeIndex={step} onStepSelect={setStep} />
        <p className="audion-edit-lede">
          {isCreate ? t('dialogs.studyLedeCreate') : t('dialogs.studyLedeEdit')}
        </p>

        {step === 0 ? (
          <>
            {isCreate && packs.length ? (
              <Field
                label={t('dialogs.studyScenarioPack')}
                size="md"
                htmlFor="study-pack"
                className="audion-edit-field"
              >
                <Select
                  id="study-pack"
                  options={[
                    { value: BLANK_PACK, label: t('dialogs.studyBlank') },
                    ...packs.map((p) => ({
                      value: p.id,
                      label: t('dialogs.studyPackRuns', { name: p.name, count: p.runCount }),
                    })),
                  ]}
                  value={packId}
                  onChange={(value) => {
                    setPackId(value)
                    const pack = packs.find((p) => p.id === value)
                    if (pack) {
                      setForm((prev) => ({
                        ...prev,
                        name: prev.name || pack.name,
                        sourceGuide: pack.sourceGuide ?? prev.sourceGuide,
                        targetUrlKey: pack.targetUrlKey,
                      }))
                    }
                  }}
                />
              </Field>
            ) : null}
            <Field
              label={t('dialogs.fieldName')}
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
                placeholder={
                  packId !== BLANK_PACK
                    ? t('dialogs.studyNameOverridePh')
                    : t('dialogs.studyNamePh')
                }
              />
            </Field>
            <Field
              label={t('dialogs.fieldStatus')}
              size="md"
              htmlFor="study-status"
              className="audion-edit-field"
            >
              <Select
                id="study-status"
                options={statusOptions}
                value={form.status ?? 'draft'}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as UxStudyStatus }))
                }
              />
            </Field>
            <Field
              label={t('dialogs.studyTargetUrlKey')}
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
              label={t('dialogs.studySourceGuide')}
              size="md"
              htmlFor="study-guide"
              className="audion-edit-field"
            >
              <Input
                id="study-guide"
                block
                value={form.sourceGuide ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceGuide: e.target.value }))}
                placeholder={t('dialogs.studyGuidePh')}
              />
            </Field>
            <Field
              label={t('dialogs.fieldDescription')}
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
                placeholder={t('dialogs.studyDescPh')}
              />
            </Field>
          </>
        ) : (
          <Field
            label={t('dialogs.studyHypLabel')}
            size="md"
            htmlFor="study-hyps"
            className="audion-edit-field"
          >
            <TagInput
              id="study-hyps"
              size="md"
              value={hypTags}
              onChange={setHypTags}
              placeholder={t('dialogs.studyHypPh')}
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
  const t = useT()
  const [open, setOpen] = useState(false)
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
              {t('tiles.newStudy')}
            </Text>
            <p className="audion-tg-card-meta">
              <span>{t('tiles.newStudyMeta')}</span>
            </p>
          </Panel>
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t('tiles.newStudy')}
        </Button>
      )}
      {open ? (
        <StudyEditDialog open onClose={() => setOpen(false)} mode="create" study={null} />
      ) : null}
    </>
  )
}
