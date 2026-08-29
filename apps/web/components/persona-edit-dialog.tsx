'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaDetail, PersonaStatus, PersonaWritePayload } from '@audion-v3/contracts'
import { Button, Field, Input, Textarea } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export type PersonaEditMode = 'edit' | 'create' | 'template'

type ProjectOption = { id: string; name: string }

function emptyPayload(projectId?: string | null): PersonaWritePayload {
  return {
    name: '',
    role: '',
    status: 'draft',
    archetype: '',
    age: '',
    location: '',
    bio: '',
    goals: [],
    frustrations: [],
    channels: [],
    projectId: projectId ?? null,
  }
}

function fromPersona(persona: PersonaDetail, mode: PersonaEditMode): PersonaWritePayload {
  const base = {
    name: mode === 'template' ? `${persona.name} (copy)` : persona.name,
    role: persona.role,
    status: (mode === 'template' ? 'draft' : persona.status) as PersonaStatus,
    archetype: persona.archetype ?? '',
    age: persona.age ?? '',
    location: persona.location ?? '',
    bio: persona.bio ?? '',
    goals: [...persona.goals],
    frustrations: [...persona.frustrations],
    channels: [...persona.channels],
    projectId: persona.projectId,
  }
  return base
}

export function PersonaEditDialog({
  open,
  onClose,
  mode,
  persona,
  defaultProjectId,
}: {
  open: boolean
  onClose: () => void
  mode: PersonaEditMode
  persona: PersonaDetail | null
  defaultProjectId?: string | null
}) {
  const t = useT()
  const router = useRouter()
  const [form, setForm] = useState<PersonaWritePayload>(emptyPayload(defaultProjectId))
  const [nameError, setNameError] = useState<string | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])

  const statusOptions = [
    { value: 'draft', label: t('dialogs.statusDraft') },
    { value: 'ready', label: 'Ready' },
    { value: 'archived', label: t('dialogs.statusArchived') },
  ]

  const projectOptions = [
    { value: '', label: t('common.select') },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ]

  useEffect(() => {
    if (!open) return
    if (mode === 'create') setForm(emptyPayload(defaultProjectId))
    else if (persona) setForm(fromPersona(persona, mode))
    setNameError(null)
    setProjectError(null)
    setSaveError(null)
  }, [open, mode, persona, defaultProjectId])

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

  const title =
    mode === 'edit'
      ? t('tiles.editPersona')
      : mode === 'template'
        ? t('tiles.fromTemplateAria')
        : t('tiles.createPersona')

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
      const payload: PersonaWritePayload = {
        ...form,
        name: form.name.trim(),
        role: form.role.trim() || 'Persona',
        archetype: form.archetype || null,
        age: form.age || null,
        location: form.location || null,
        bio: form.bio || null,
        projectId: form.projectId!.trim(),
      }
      const isCreate = mode === 'create' || mode === 'template'
      const url = isCreate
        ? paths.routes.apiPersonas
        : paths.routes.apiPersonaDetail(persona!.id)
      const response = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const saved = (await response.json()) as PersonaDetail
      onClose()
      router.push(paths.routes.personaDetail(saved.id))
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('dialogs.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="audion-edit-dialog"
      title={title}
      actions={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button size="md" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="audion-edit-form">
        <Field
          label={t('dialogs.fieldName')}
          size="md"
          error={nameError ?? undefined}
          htmlFor="persona-name"
          className="audion-edit-field audion-edit-field--hero"
        >
          <Input
            id="persona-name"
            size="md"
            block
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
          htmlFor="persona-project"
          className="audion-edit-field"
        >
          <Select
            id="persona-project"
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
          <Field label="Role" size="md" htmlFor="persona-role" className="audion-edit-field">
            <Input
              id="persona-role"
              size="md"
              block
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
          </Field>
          <Field label={t('dialogs.fieldStatus')} size="md" htmlFor="persona-status" className="audion-edit-field">
            <Select
              id="persona-status"
              size="md"
              value={form.status ?? 'draft'}
              onChange={(value) => setForm((f) => ({ ...f, status: value as PersonaStatus }))}
              options={statusOptions}
            />
          </Field>
        </div>
        <div className="audion-edit-row">
          <Field label="Archetype" size="md" htmlFor="persona-archetype" className="audion-edit-field">
            <Input
              id="persona-archetype"
              size="md"
              block
              value={form.archetype ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, archetype: e.target.value }))}
            />
          </Field>
          <Field label="Location" size="md" htmlFor="persona-location" className="audion-edit-field">
            <Input
              id="persona-location"
              size="md"
              block
              value={form.location ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Age" size="md" htmlFor="persona-age" className="audion-edit-field">
          <Input
            id="persona-age"
            size="md"
            block
            value={form.age ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
          />
        </Field>
        <Field label="Bio" size="md" htmlFor="persona-bio" className="audion-edit-field">
          <Textarea
            id="persona-bio"
            size="md"
            block
            rows={5}
            value={form.bio ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </Field>
        {saveError ? <p className="audion-edit-error" role="alert">{saveError}</p> : null}
      </div>
    </Dialog>
  )
}
