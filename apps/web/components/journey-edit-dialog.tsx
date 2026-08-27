'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JourneyDetail, JourneyStatus, JourneyWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { IconDelete, IconEdit } from './nav-icons'

/** Fixture TG options for MVP Select — paths/knowledge/target-group-migration-map.md */
const TARGET_GROUP_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'tg-digital-product-leads', label: 'Digital Product Leads' },
  { value: 'tg-brand-narrative', label: 'Brand Narrative Owners' },
  { value: 'tg-service-ops', label: 'Service Operations' },
]

function emptyPayload(): JourneyWritePayload {
  return {
    name: '',
    journeyType: 'awareness',
    description: '',
    status: 'draft',
    targetGroupId: null,
  }
}

export function JourneyEditDialog({
  open,
  onClose,
  mode,
  journey,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  journey: JourneyDetail | null
}) {
  const t = useT()
  const router = useRouter()
  const [form, setForm] = useState<JourneyWritePayload>(emptyPayload())
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const statusOptions = [
    { value: 'draft', label: t('dialogs.statusDraft') },
    { value: 'active', label: t('dialogs.statusActive') },
    { value: 'archived', label: t('dialogs.statusArchived') },
  ]

  const typeOptions = [
    { value: 'awareness', label: t('dialogs.journeyTypeAwareness') },
    { value: 'purchase', label: t('dialogs.journeyTypePurchase') },
    { value: 'ux_audit', label: t('dialogs.journeyTypeUxAudit') },
    { value: 'journey', label: t('dialogs.journeyTypeJourney') },
  ]

  const targetGroupOptions = [
    { value: '', label: t('common.none') },
    ...TARGET_GROUP_OPTIONS.filter((o) => o.value !== ''),
  ]

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !journey) {
      setForm(emptyPayload())
    } else {
      setForm({
        name: journey.name,
        journeyType: journey.journeyType,
        description: journey.description ?? '',
        status: journey.status,
        targetGroupId: journey.targetGroupId,
        projectId: journey.projectId,
        phases: journey.phases,
      })
    }
    setNameError(null)
    setSaveError(null)
  }, [open, mode, journey])

  async function onSave() {
    if (!form.name.trim()) {
      setNameError(t('dialogs.nameRequired'))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload: JourneyWritePayload = {
        ...form,
        name: form.name.trim(),
        journeyType: form.journeyType.trim() || 'journey',
        description: form.description || null,
        targetGroupId: form.targetGroupId || null,
      }
      const url =
        mode === 'create' ? paths.routes.apiJourneys : paths.routes.apiJourneyDetail(journey!.id)
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const saved = (await response.json()) as JourneyDetail
      onClose()
      router.push(paths.routes.journeyDetail(saved.id))
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
      title={isCreate ? t('dialogs.journeyNewTitle') : t('dialogs.journeyEditTitle')}
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
          {isCreate ? t('dialogs.journeyLedeCreate') : t('dialogs.journeyLedeEdit')}
        </p>

        <Field
          label={t('dialogs.fieldName')}
          size="md"
          error={nameError ?? undefined}
          htmlFor="journey-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="journey-name"
            block
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }))
              if (nameError) setNameError(null)
            }}
            placeholder={t('dialogs.journeyNamePh')}
          />
        </Field>

        <div className="audion-edit-row">
          <Field label={t('dialogs.fieldType')} size="md" htmlFor="journey-type">
            <Select
              id="journey-type"
              options={typeOptions}
              value={form.journeyType}
              onChange={(value) => setForm((prev) => ({ ...prev, journeyType: value }))}
            />
          </Field>
          <Field label={t('dialogs.fieldStatus')} size="md" htmlFor="journey-status">
            <Select
              id="journey-status"
              options={statusOptions}
              value={form.status ?? 'draft'}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, status: value as JourneyStatus }))
              }
            />
          </Field>
        </div>

        <Field label={t('dialogs.fieldTargetGroup')} size="md" htmlFor="journey-tg">
          <Select
            id="journey-tg"
            options={targetGroupOptions}
            value={form.targetGroupId ?? ''}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, targetGroupId: value || null }))
            }
          />
        </Field>

        <Field label={t('dialogs.fieldDescription')} size="md" htmlFor="journey-description">
          <Textarea
            id="journey-description"
            block
            rows={4}
            value={form.description ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('dialogs.journeyDescPh')}
          />
        </Field>

        {saveError ? <p className="audion-edit-error">{saveError}</p> : null}
      </div>
    </Dialog>
  )
}

export function JourneyDetailActions({ journey }: { journey: JourneyDetail }) {
  const t = useT()
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function onDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch(paths.routes.apiJourneyDetail(journey.id), {
        method: 'DELETE',
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Delete failed (${response.status})`)
      }
      setDeleteOpen(false)
      router.push(paths.routes.journeys)
      router.refresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('dialogs.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label={t('tiles.editJourney')}
        title={t('tiles.editJourney')}
        icon={<IconEdit />}
        onClick={() => setEditOpen(true)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn audion-delete-icon-btn"
        aria-label={t('tiles.deleteJourney')}
        title={t('tiles.deleteJourney')}
        icon={<IconDelete />}
        onClick={() => {
          setDeleteError(null)
          setDeleteOpen(true)
        }}
      />
      {editOpen ? (
        <JourneyEditDialog
          open
          onClose={() => setEditOpen(false)}
          mode="edit"
          journey={journey}
        />
      ) : null}
      {deleteOpen ? (
        <Dialog
          open
          onClose={() => {
            if (!deleting) setDeleteOpen(false)
          }}
          className="audion-edit-dialog"
          title={t('dialogs.deleteJourneyTitle')}
          actions={
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onDelete()} disabled={deleting}>
                {deleting ? t('common.deleting') : t('common.delete')}
              </Button>
            </>
          }
        >
          <p>{t('dialogs.deleteJourneyBody', { name: journey.name })}</p>
          {deleteError ? (
            <p className="audion-edit-error" role="alert">
              {deleteError}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </>
  )
}

export function JourneyCreateButton({
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
              {t('tiles.newJourney')}
            </Text>
            <p className="audion-tg-card-meta">
              <span>{t('tiles.newJourneyMeta')}</span>
            </p>
          </Panel>
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t('tiles.createJourney')}
        </Button>
      )}
      {open ? (
        <JourneyEditDialog open onClose={() => setOpen(false)} mode="create" journey={null} />
      ) : null}
    </>
  )
}
