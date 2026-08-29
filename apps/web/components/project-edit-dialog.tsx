'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectDetail, ProjectStatus, ProjectWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Textarea, Alert } from '@msqdx/ui'
import { ConfirmDialog, Dialog, Select } from '../lib/msqdx-ui-client'
import { HubIndexCard } from '../lib/msqdx-ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { IconDelete, IconEdit } from './nav-icons'

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
  const t = useT()
  const router = useRouter()
  const [form, setForm] = useState<ProjectWritePayload>(emptyPayload())
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const statusOptions = [
    { value: 'draft', label: t('dialogs.statusDraft') },
    { value: 'published', label: t('dialogs.statusPublished') },
  ]

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
      setNameError(t('dialogs.nameRequired'))
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
      title={isCreate ? t('dialogs.projectNewTitle') : t('dialogs.projectEditTitle')}
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
          {isCreate ? t('dialogs.projectLedeCreate') : t('dialogs.projectLedeEdit')}
        </p>

        <Field
          label={t('dialogs.fieldName')}
          size="md"
          error={nameError ?? undefined}
          htmlFor="project-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="project-name"
            size="md"
            block
            placeholder={t('dialogs.projectNamePh')}
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }))
              setNameError(null)
            }}
          />
        </Field>

        <div className="audion-edit-row">
          <Field
            label={t('dialogs.fieldNameDe')}
            size="md"
            htmlFor="project-name-de"
            className="audion-edit-field"
          >
            <Input
              id="project-name-de"
              size="md"
              block
              placeholder={t('common.optional')}
              value={form.nameDe ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, nameDe: e.target.value }))}
            />
          </Field>
          <Field
            label={t('dialogs.fieldStatus')}
            size="md"
            htmlFor="project-status"
            className="audion-edit-field"
          >
            <Select
              id="project-status"
              options={statusOptions}
              value={form.status ?? 'draft'}
              onChange={(value) =>
                setForm((f) => ({ ...f, status: value as ProjectStatus }))
              }
            />
          </Field>
        </div>

        <Field
          label={t('dialogs.fieldDescription')}
          size="md"
          htmlFor="project-description"
          className="audion-edit-field"
        >
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
            label={t('dialogs.projectKnowledgeLabel')}
            size="md"
            htmlFor="project-company-context"
            className="audion-edit-field"
          >
            <Textarea
              id="project-company-context"
              size="md"
              block
              rows={4}
              placeholder={t('dialogs.projectKnowledgePh')}
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
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      {variant === 'card' ? (
        <HubIndexCard
          variant="create"
          className="audion-tg-card audion-tg-card--create"
          title={t('tiles.newProject')}
          meta={t('tiles.newProjectMeta')}
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {t('tiles.newProject')}
        </Button>
      )}
      {open ? (
        <ProjectEditDialog open onClose={() => setOpen(false)} mode="create" project={null} />
      ) : null}
    </>
  )
}

export function ProjectDetailActions({ project }: { project: ProjectDetail }) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmArchive() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiProjectArchive(project.id), { method: 'POST' })
      if (!res.ok) throw new Error(t('dialogs.archiveFailed', { status: res.status }))
      setArchiveOpen(false)
      router.push(paths.routes.projects)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dialogs.archiveFailedGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label={t('tiles.editProject')}
        icon={<IconEdit />}
        onClick={() => setOpen(true)}
      />
      <Button
        variant="ghost"
        size="sm"
        className="audion-edit-icon-btn"
        aria-label={t('tiles.archiveProject')}
        icon={<IconDelete />}
        onClick={() => {
          setError(null)
          setArchiveOpen(true)
        }}
      />
      <ProjectEditDialog open={open} onClose={() => setOpen(false)} mode="edit" project={project} />
      <ConfirmDialog
        open={archiveOpen}
        onClose={() => {
          if (!busy) setArchiveOpen(false)
        }}
        onConfirm={() => {
          void confirmArchive()
        }}
        title={t('dialogs.archiveTitle')}
        confirmLabel={busy ? t('dialogs.archiving') : t('dialogs.archiveConfirm')}
        danger
      >
        {t('dialogs.archiveBody', { name: project.name })}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </ConfirmDialog>
    </>
  )
}
