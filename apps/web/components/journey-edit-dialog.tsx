'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JourneyDetail, JourneyStatus, JourneyWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { IconDelete, IconEdit } from './nav-icons'
import { ValidateJourneyButton } from './validate-journey-button'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

const TYPE_OPTIONS = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'ux_audit', label: 'UX audit' },
  { value: 'journey', label: 'Journey' },
]

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
  const router = useRouter()
  const [form, setForm] = useState<JourneyWritePayload>(emptyPayload())
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
      setNameError('Name is required')
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
      title={isCreate ? 'New journey' : 'Edit journey'}
      actions={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="md" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : isCreate ? 'Create' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="audion-edit-form">
        <p className="audion-edit-lede">
          {isCreate
            ? 'Name the map and link a target group — phases can grow on the detail page later.'
            : 'Update the journey brief. Edit phases on the timeline below.'}
        </p>

        <Field
          label="Name"
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
            placeholder="Journey name"
          />
        </Field>

        <div className="audion-edit-row">
          <Field label="Type" size="md" htmlFor="journey-type">
            <Select
              id="journey-type"
              options={TYPE_OPTIONS}
              value={form.journeyType}
              onChange={(value) => setForm((prev) => ({ ...prev, journeyType: value }))}
            />
          </Field>
          <Field label="Status" size="md" htmlFor="journey-status">
            <Select
              id="journey-status"
              options={STATUS_OPTIONS}
              value={form.status ?? 'draft'}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, status: value as JourneyStatus }))
              }
            />
          </Field>
        </div>

        <Field label="Target group" size="md" htmlFor="journey-tg">
          <Select
            id="journey-tg"
            options={TARGET_GROUP_OPTIONS}
            value={form.targetGroupId ?? ''}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, targetGroupId: value || null }))
            }
          />
        </Field>

        <Field label="Description" size="md" htmlFor="journey-description">
          <Textarea
            id="journey-description"
            block
            rows={4}
            value={form.description ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="What decision or path does this map clarify?"
          />
        </Field>

        {saveError ? <p className="audion-edit-error">{saveError}</p> : null}
      </div>
    </Dialog>
  )
}

export function JourneyDetailActions({ journey }: { journey: JourneyDetail }) {
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
      setDeleteError(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="audion-magazine-topbar-actions">
      <ValidateJourneyButton journey={journey} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label="Edit journey"
        title="Edit journey"
        icon={<IconEdit />}
        onClick={() => setEditOpen(true)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn audion-delete-icon-btn"
        aria-label="Delete journey"
        title="Delete journey"
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
          title="Delete journey?"
          actions={
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button size="md" onClick={() => void onDelete()} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </>
          }
        >
          <p>
            Delete <strong>{journey.name}</strong> and all of its phases? This cannot be undone.
          </p>
          {deleteError ? (
            <p className="audion-edit-error" role="alert">
              {deleteError}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  )
}

export function JourneyCreateButton({
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
          <Panel as="div" variant="card" className="audion-tg-card-panel audion-tg-card-panel--create">
            <Text role="headline" as="span" className="audion-tg-card-title">
              New journey
            </Text>
            <p className="audion-tg-card-meta">
              <span>Map a customer path</span>
            </p>
          </Panel>
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          Create journey
        </Button>
      )}
      {open ? (
        <JourneyEditDialog open onClose={() => setOpen(false)} mode="create" journey={null} />
      ) : null}
    </>
  )
}
