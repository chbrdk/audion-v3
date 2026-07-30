'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectDetail, ProjectStatus, ProjectWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { IconEdit } from './nav-icons'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

function emptyPayload(): ProjectWritePayload {
  return {
    name: '',
    nameDe: '',
    description: '',
    companyContext: '',
    status: 'draft',
  }
}

export function ProjectEditDialog({
  open,
  onClose,
  mode,
  project,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  project: ProjectDetail | null
}) {
  const router = useRouter()
  const [form, setForm] = useState<ProjectWritePayload>(emptyPayload())
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !project) {
      setForm(emptyPayload())
    } else {
      setForm({
        name: project.name,
        nameDe: project.nameDe ?? '',
        description: project.description ?? '',
        status: project.status,
      })
    }
    setNameError(null)
    setSaveError(null)
  }, [open, mode, project])

  async function onSave() {
    if (!form.name.trim()) {
      setNameError('Name is required')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload: ProjectWritePayload = {
        name: form.name.trim(),
        nameDe: form.nameDe?.trim() || null,
        description: form.description || null,
        status: form.status ?? 'draft',
      }
      if (mode === 'create' && form.companyContext?.trim()) {
        payload.companyContext = form.companyContext.trim()
      }
      const url =
        mode === 'create' ? paths.routes.apiProjects : paths.routes.apiProjectDetail(project!.id)
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const saved = (await response.json()) as ProjectDetail
      onClose()
      router.push(paths.routes.projectDetail(saved.id))
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
      title={isCreate ? 'New project' : 'Edit project'}
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
            ? 'Name the workspace, then add a short company brief.'
            : 'Update project context. Audience counts stay linked via personas and target groups.'}
        </p>

        <Field
          label="Name"
          size="md"
          error={nameError ?? undefined}
          htmlFor="project-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="project-name"
            size="md"
            block
            placeholder="e.g. AUDION Core"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }))
              setNameError(null)
            }}
          />
        </Field>

        <div className="audion-edit-row">
          <Field label="Name (DE)" size="md" htmlFor="project-name-de" className="audion-edit-field">
            <Input
              id="project-name-de"
              size="md"
              block
              placeholder="Optional"
              value={form.nameDe ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, nameDe: e.target.value }))}
            />
          </Field>
          <Field label="Status" size="md" htmlFor="project-status" className="audion-edit-field">
            <Select
              id="project-status"
              options={STATUS_OPTIONS}
              value={form.status ?? 'draft'}
              onChange={(value) =>
                setForm((f) => ({ ...f, status: value as ProjectStatus }))
              }
            />
          </Field>
        </div>

        <Field label="Description" size="md" htmlFor="project-description" className="audion-edit-field">
          <Textarea
            id="project-description"
            size="md"
            block
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        {isCreate ? (
          <Field
            label="Initial knowledge brief"
            size="md"
            htmlFor="project-company-context"
            className="audion-edit-field"
          >
            <Textarea
              id="project-company-context"
              size="md"
              block
              rows={4}
              placeholder="Optional — becomes the first knowledge chapter"
              value={form.companyContext ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, companyContext: e.target.value }))}
            />
          </Field>
        ) : null}

        {saveError ? <p className="audion-edit-error">{saveError}</p> : null}
      </div>
    </Dialog>
  )
}

export function ProjectCreateButton({ variant = 'card' }: { variant?: 'card' | 'button' }) {
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
              New project
            </Text>
            <p className="audion-tg-card-meta">
              <span>Create a workspace</span>
            </p>
          </Panel>
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          New project
        </Button>
      )}
      {open ? (
        <ProjectEditDialog open onClose={() => setOpen(false)} mode="create" project={null} />
      ) : null}
    </>
  )
}

export function ProjectDetailActions({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label="Edit project"
        icon={<IconEdit />}
        onClick={() => setOpen(true)}
      />
      <ProjectEditDialog open={open} onClose={() => setOpen(false)} mode="edit" project={project} />
    </>
  )
}
