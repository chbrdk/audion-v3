'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  TargetGroupDetail,
  TargetGroupStatus,
  TargetGroupWritePayload,
} from '@audion-v3/contracts'
import { Button, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Dialog, Select, TagInput } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { IconEdit } from './nav-icons'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

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
  const router = useRouter()
  const [form, setForm] = useState<TargetGroupWritePayload>(emptyPayload(defaultProjectId))
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !targetGroup) {
      setForm(emptyPayload(defaultProjectId))
    } else {
      setForm({
        name: targetGroup.name,
        segment: targetGroup.segment,
        description: targetGroup.description ?? '',
        status: targetGroup.status,
        projectId: targetGroup.projectId,
        linkedPersonaIds: targetGroup.linkedPersonas.map((p) => p.id),
      })
    }
    setNameError(null)
    setSaveError(null)
  }, [open, mode, targetGroup, defaultProjectId])

  async function onSave() {
    if (!form.name.trim()) {
      setNameError('Name is required')
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
      router.push(paths.routes.targetGroupDetail(saved.id))
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
      title={isCreate ? 'New target group' : 'Edit target group'}
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
            ? 'Name the segment, then add a short brief — same language as the magazine cards.'
            : 'Update the segment brief. Linked personas stay optional.'}
        </p>

        <Field
          label="Name"
          size="md"
          error={nameError ?? undefined}
          htmlFor="tg-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="tg-name"
            size="md"
            block
            placeholder="e.g. Digital Product Leads"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }))
              setNameError(null)
            }}
          />
        </Field>

        <div className="audion-edit-row">
          <Field label="Segment" size="md" htmlFor="tg-segment" className="audion-edit-field">
            <Input
              id="tg-segment"
              size="md"
              block
              placeholder="e.g. B2B SaaS · Decision makers"
              value={form.segment}
              onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
            />
          </Field>
          <Field label="Status" size="md" htmlFor="tg-status" className="audion-edit-field">
            <Select
              id="tg-status"
              size="md"
              value={form.status ?? 'draft'}
              onChange={(value) => setForm((f) => ({ ...f, status: value as TargetGroupStatus }))}
              options={STATUS_OPTIONS}
            />
          </Field>
        </div>

        <Field label="Description" size="md" htmlFor="tg-description" className="audion-edit-field">
          <Textarea
            id="tg-description"
            size="md"
            block
            rows={5}
            placeholder="Short segment brief — who they are, what they need…"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <Field
          label="Linked personas"
          hint="Persona ids — press Enter to add"
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

        {saveError ? <p className="audion-edit-error" role="alert">{saveError}</p> : null}
      </div>
    </Dialog>
  )
}

export function TargetGroupDetailActions({ targetGroup }: { targetGroup: TargetGroupDetail }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label="Edit target group"
        title="Edit target group"
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
              New target group
            </Text>
            <p className="audion-tg-card-meta">
              <span>Create a segment brief</span>
            </p>
          </Panel>
        </button>
      ) : variant === 'row' ? (
        <button
          type="button"
          className="audion-editable-list-add-row"
          aria-label="Add target group"
          onClick={() => setOpen(true)}
        >
          <span className="audion-magazine-list-num" aria-hidden>
            {num}
          </span>
          <span className="audion-editable-list-add-label">Add target group</span>
        </button>
      ) : variant === 'link' ? (
        <button type="button" className="audion-link" onClick={() => setOpen(true)}>
          Add one
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          Create target group
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
