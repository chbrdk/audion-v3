'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  TargetGroupDetail,
  TargetGroupStatus,
  TargetGroupWritePayload,
} from '@audion-v3/contracts'
import { Button, Field, Input, Meter, MeterList, Panel, Text, Textarea } from '@msqdx/ui'
import { Dialog, Select, TagInput } from '../lib/msqdx-ui-client'
import {
  buildBehavioralPriorsPayload,
  emptyTgPriorsForm,
  TG_PRIOR_DIM_KEYS,
  tgPriorsFormFromStored,
  type TgPriorDimKey,
  type TgPriorsFormState,
} from '../lib/behavior/tg-priors-form'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { IconEdit } from './nav-icons'

const PRIOR_DIM_LABEL_KEYS: Record<TgPriorDimKey, string> = {
  timePressure: 'dialogs.tgPriorTime',
  trustSkepticism: 'dialogs.tgPriorTrust',
  warmth: 'dialogs.tgPriorWarmth',
  detailOrientation: 'dialogs.tgPriorDetail',
  stressSensitivity: 'dialogs.tgPriorStressDim',
}

type ProjectOption = { id: string; name: string }

function emptyPayload(projectId?: string | null): TargetGroupWritePayload {
  return {
    name: '',
    segment: '',
    description: '',
    status: 'draft',
    projectId: projectId ?? null,
    linkedPersonaIds: [],
  }
}

export function TargetGroupEditDialog({
  open,
  onClose,
  mode,
  targetGroup,
  defaultProjectId,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  targetGroup: TargetGroupDetail | null
  defaultProjectId?: string | null
}) {
  const t = useT()
  const router = useRouter()
  const [form, setForm] = useState<TargetGroupWritePayload>(emptyPayload(defaultProjectId))
  const [priorsForm, setPriorsForm] = useState<TgPriorsFormState>(emptyTgPriorsForm)
  const [nameError, setNameError] = useState<string | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])

  const statusOptions = [
    { value: 'draft', label: t('dialogs.statusDraft') },
    { value: 'active', label: t('dialogs.statusActive') },
    { value: 'archived', label: t('dialogs.statusArchived') },
  ]

  const projectOptions = [
    { value: '', label: t('common.select') },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ]

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !targetGroup) {
      setForm(emptyPayload(defaultProjectId))
      setPriorsForm(emptyTgPriorsForm())
    } else {
      setForm({
        name: targetGroup.name,
        segment: targetGroup.segment,
        description: targetGroup.description ?? '',
        status: targetGroup.status,
        projectId: targetGroup.projectId,
        linkedPersonaIds: targetGroup.linkedPersonas.map((p) => p.id),
        behavioralPriors: targetGroup.behavioralPriors ?? null,
      })
      setPriorsForm(tgPriorsFormFromStored(targetGroup.behavioralPriors))
    }
    setNameError(null)
    setProjectError(null)
    setSaveError(null)
  }, [open, mode, targetGroup, defaultProjectId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(paths.routes.apiAiOptions)
        if (!res.ok) return
        const data = (await res.json()) as { projects?: ProjectOption[] }
        if (!cancelled && Array.isArray(data.projects)) setProjects(data.projects)
      } catch {
        /* picker stays empty; save still validates */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  async function onSave() {
    if (!form.name.trim()) {
      setNameError(t('dialogs.nameRequired'))
      return
    }
    if (!form.projectId?.trim()) {
      setProjectError(t('dialogs.projectRequired'))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload: TargetGroupWritePayload = {
        ...form,
        name: form.name.trim(),
        segment: form.segment.trim() || 'Segment',
        description: form.description || null,
        projectId: form.projectId!.trim(),
        behavioralPriors: buildBehavioralPriorsPayload(priorsForm),
      }
      const url =
        mode === 'create'
          ? paths.routes.apiTargetGroups
          : paths.routes.apiTargetGroupDetail(targetGroup!.id)
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const saved = (await response.json()) as TargetGroupDetail
      onClose()
      router.push(paths.routes.targetGroupDetailEntity(saved))
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
      title={isCreate ? t('dialogs.tgNewTitle') : t('dialogs.tgEditTitle')}
      actions={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button size="md" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : isCreate ? t('common.create') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="audion-edit-form">
        <p className="audion-edit-lede">
          {isCreate ? t('dialogs.tgLedeCreate') : t('dialogs.tgLedeEdit')}
        </p>

        <Field
          label={t('dialogs.fieldName')}
          size="md"
          error={nameError ?? undefined}
          htmlFor="tg-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="tg-name"
            size="md"
            block
            placeholder={t('dialogs.tgNamePh')}
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }))
              setNameError(null)
            }}
          />
        </Field>

        <Field
          label={t('dialogs.fieldProject')}
          size="md"
          error={projectError ?? undefined}
          htmlFor="tg-project"
          className="audion-edit-field"
        >
          <Select
            id="tg-project"
            size="md"
            value={form.projectId ?? ''}
            onChange={(value) => {
              setForm((f) => ({ ...f, projectId: value || null }))
              setProjectError(null)
            }}
            options={projectOptions}
          />
        </Field>

        <div className="audion-edit-row">
          <Field
            label={t('dialogs.fieldSegment')}
            size="md"
            htmlFor="tg-segment"
            className="audion-edit-field"
          >
            <Input
              id="tg-segment"
              size="md"
              block
              placeholder={t('dialogs.tgSegmentPh')}
              value={form.segment}
              onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
            />
          </Field>
          <Field
            label={t('dialogs.fieldStatus')}
            size="md"
            htmlFor="tg-status"
            className="audion-edit-field"
          >
            <Select
              id="tg-status"
              size="md"
              value={form.status ?? 'draft'}
              onChange={(value) => setForm((f) => ({ ...f, status: value as TargetGroupStatus }))}
              options={statusOptions}
            />
          </Field>
        </div>

        <Field
          label={t('dialogs.fieldDescription')}
          size="md"
          htmlFor="tg-description"
          className="audion-edit-field"
        >
          <Textarea
            id="tg-description"
            size="md"
            block
            rows={5}
            placeholder={t('dialogs.tgDescPh')}
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <Field
          label={t('dialogs.tgLinkedPersonas')}
          hint={t('dialogs.tgLinkedHint')}
          size="md"
          htmlFor="tg-personas"
          className="audion-edit-field"
        >
          <TagInput
            id="tg-personas"
            size="md"
            value={form.linkedPersonaIds ?? []}
            onChange={(linkedPersonaIds) => setForm((f) => ({ ...f, linkedPersonaIds }))}
            placeholder="persona-alex-morgan"
          />
        </Field>

        <div className="audion-edit-field audion-tg-priors-band" data-testid="tg-behavioral-priors">
          <Text role="title" as="h3" className="audion-edit-section-title">
            {t('dialogs.tgPriorsTitle')}
          </Text>
          <p className="audion-edit-lede">{t('dialogs.tgPriorsLede')}</p>

          <MeterList aria-label={t('dialogs.tgPriorsTitle')}>
            <Meter
              label={t('dialogs.tgPriorBlend')}
              value={Math.round((priorsForm.blendWeight ?? 0.25) * 100)}
              max={100}
              onChange={(next) =>
                setPriorsForm((f) => ({
                  ...f,
                  blendWeight: Math.min(1, Math.max(0, next / 100)),
                }))
              }
            />
            {TG_PRIOR_DIM_KEYS.map((key) => {
              const raw = priorsForm.dimensions[key]
              const value = typeof raw === 'number' ? raw : 0.5
              return (
                <Meter
                  key={key}
                  label={t(PRIOR_DIM_LABEL_KEYS[key])}
                  value={Math.round(value * 100)}
                  max={100}
                  onChange={(next) =>
                    setPriorsForm((f) => ({
                      ...f,
                      dimensions: {
                        ...f.dimensions,
                        [key]: Math.min(1, Math.max(0, next / 100)),
                      },
                    }))
                  }
                />
              )
            })}
          </MeterList>

          <Field
            label={t('dialogs.tgPriorCues')}
            hint={t('dialogs.tgPriorCuesHint')}
            size="md"
            htmlFor="tg-prior-cues"
            className="audion-edit-field"
          >
            <TagInput
              id="tg-prior-cues"
              size="md"
              value={priorsForm.segmentCues}
              onChange={(segmentCues) => setPriorsForm((f) => ({ ...f, segmentCues }))}
              placeholder={t('dialogs.tgPriorCuesPh')}
            />
          </Field>
          <Field
            label={t('dialogs.tgPriorStressTriggers')}
            size="md"
            htmlFor="tg-prior-stress"
            className="audion-edit-field"
          >
            <TagInput
              id="tg-prior-stress"
              size="md"
              value={priorsForm.sharedStressTriggers}
              onChange={(sharedStressTriggers) =>
                setPriorsForm((f) => ({ ...f, sharedStressTriggers }))
              }
              placeholder={t('dialogs.tgPriorStressTriggersPh')}
            />
          </Field>
          <Field
            label={t('dialogs.tgPriorAvoid')}
            size="md"
            htmlFor="tg-prior-avoid"
            className="audion-edit-field"
          >
            <TagInput
              id="tg-prior-avoid"
              size="md"
              value={priorsForm.sharedAvoidances}
              onChange={(sharedAvoidances) => setPriorsForm((f) => ({ ...f, sharedAvoidances }))}
              placeholder={t('dialogs.tgPriorAvoidPh')}
            />
          </Field>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPriorsForm(emptyTgPriorsForm())}
          >
            {t('dialogs.tgPriorsClear')}
          </Button>
        </div>

        {saveError ? <p className="audion-edit-error" role="alert">{saveError}</p> : null}
      </div>
    </Dialog>
  )
}

export function TargetGroupDetailActions({ targetGroup }: { targetGroup: TargetGroupDetail }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label={t('tiles.editTargetGroup')}
        title={t('tiles.editTargetGroup')}
        icon={<IconEdit />}
        onClick={() => setOpen(true)}
      />
      {open ? (
        <TargetGroupEditDialog
          open
          onClose={() => setOpen(false)}
          mode="edit"
          targetGroup={targetGroup}
        />
      ) : null}
    </>
  )
}

export function TargetGroupCreateButton({
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
              {t('tiles.newTargetGroup')}
            </Text>
            <p className="audion-tg-card-meta">
              <span>{t('tiles.newTargetGroupMeta')}</span>
            </p>
          </Panel>
        </button>
      ) : variant === 'row' ? (
        <button
          type="button"
          className="audion-editable-list-add-row"
          aria-label={t('tiles.addTargetGroup')}
          onClick={() => setOpen(true)}
        >
          <span className="audion-magazine-list-num" aria-hidden>
            {num}
          </span>
          <span className="audion-editable-list-add-label">{t('tiles.addTargetGroup')}</span>
        </button>
      ) : variant === 'link' ? (
        <button type="button" className="audion-link" onClick={() => setOpen(true)}>
          {t('tiles.addTargetGroup')}
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t('tiles.createTargetGroup')}
        </Button>
      )}
      {open ? (
        <TargetGroupEditDialog
          open
          onClose={() => setOpen(false)}
          mode="create"
          targetGroup={null}
          defaultProjectId={projectId}
        />
      ) : null}
    </>
  )
}
