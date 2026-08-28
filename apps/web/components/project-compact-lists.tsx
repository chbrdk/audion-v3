'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  PersonaSummary,
  ProjectMember,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import { Button, EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { IconDelete } from './nav-icons'
import { PersonaCreateButton } from './persona-actions'
import { TargetGroupCreateButton } from './target-group-edit-dialog'

type CompactRow = {
  id: string
  name: string
  meta: string
  href?: string
}

const DRAFT_PREFIX = '__draft__'

function isDraftId(id: string) {
  return id.startsWith(DRAFT_PREFIX)
}

function toPersonaRows(items: PersonaSummary[]): CompactRow[] {
  return items.map((p) => ({
    id: p.id,
    name: p.name,
    meta: `${p.role}${p.archetype ? ` · ${p.archetype}` : ''} · ${p.status}`,
    href: paths.routes.personaDetail(p.id),
  }))
}

function toGroupRows(items: TargetGroupSummary[]): CompactRow[] {
  return items.map((g) => ({
    id: g.id,
    name: g.name,
    meta: `${g.segment} · ${g.personaCount} persona${g.personaCount === 1 ? '' : 's'} · ${g.status}`,
    href: paths.routes.targetGroupDetail(g.id),
  }))
}

function toMemberRows(items: ProjectMember[]): CompactRow[] {
  return items.map((m) => ({
    id: m.id,
    name: m.email,
    meta: `${m.role} · ${m.status}`,
  }))
}

async function patchJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error || `Save failed (${response.status})`)
  }
  return response.json()
}

async function deleteJson(url: string) {
  const response = await fetch(url, { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error || `Delete failed (${response.status})`)
  }
}

function CompactEditableList({
  title,
  singular,
  rows,
  empty,
  createSlot,
  draftMeta,
  addLabel,
  onRename,
  onRemove,
  onCreate,
}: {
  title: string
  singular: string
  rows: CompactRow[]
  empty: React.ReactNode
  createSlot?: React.ReactNode
  draftMeta?: string
  addLabel?: string
  onRename: (id: string, name: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onCreate?: (name: string) => Promise<void>
}) {
  const baseId = useId()
  const [localRows, setLocalRows] = useState(rows)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)

  useEffect(() => {
    setLocalRows(rows)
    setEditingId(null)
    setDraft('')
    setError(null)
  }, [rows])

  useEffect(() => {
    if (!editingId) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingId])

  function beginEdit(row: CompactRow) {
    if (saving) return
    setEditingId(row.id)
    setDraft(row.name)
    setError(null)
  }

  function cancelEdit() {
    skipBlurSave.current = true
    if (editingId && isDraftId(editingId)) {
      setLocalRows((prev) => prev.filter((r) => r.id !== editingId))
    }
    setEditingId(null)
    setDraft('')
  }

  async function commitEdit() {
    if (!editingId) return
    const trimmed = draft.trim()
    const previous = localRows.find((r) => r.id === editingId)?.name ?? ''
    const draftRow = isDraftId(editingId)

    if (!trimmed) {
      if (draftRow || !previous.trim()) {
        setLocalRows((prev) => prev.filter((r) => r.id !== editingId))
        setEditingId(null)
        setDraft('')
        return
      }
      cancelEdit()
      return
    }

    if (!draftRow && trimmed === previous) {
      setEditingId(null)
      setDraft('')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (draftRow) {
        if (!onCreate) throw new Error('Create is not supported')
        await onCreate(trimmed)
      } else {
        await onRename(editingId, trimmed)
        setLocalRows((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, name: trimmed } : r)),
        )
      }
      setEditingId(null)
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmDelete() {
    if (!deleteId) return
    setSaving(true)
    setError(null)
    try {
      if (!isDraftId(deleteId)) await onRemove(deleteId)
      setLocalRows((prev) => prev.filter((r) => r.id !== deleteId))
      setDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function handleAddDraft() {
    if (saving || editingId != null || !onCreate) return
    const id = `${DRAFT_PREFIX}${Date.now().toString(36)}`
    setLocalRows((prev) => [
      ...prev,
      { id, name: '', meta: draftMeta ?? `new ${singular}` },
    ])
    setEditingId(id)
    setDraft('')
    setError(null)
  }

  const deleteLabel = deleteId ? localRows.find((r) => r.id === deleteId)?.name ?? singular : ''
  const nextNum = String(localRows.length + 1).padStart(2, '0')
  const showAddFoot = localRows.length > 0 && (createSlot || onCreate)

  return (
    <Panel className="stage-panel audion-magazine-band audion-editable-list audion-project-compact-list">
      <SectionChrome quiet title={title} meta={`${localRows.filter((r) => !isDraftId(r.id)).length}`} as="h3" />

      {localRows.length ? (
        <ol className="audion-magazine-list audion-editable-list-items">
          {localRows.map((row, index) => {
            const isEditing = editingId === row.id
            return (
              <li key={row.id} className="audion-editable-list-row">
                <span className="audion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="audion-editable-list-main">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      id={`${baseId}-${row.id}`}
                      className="audion-editable-list-input"
                      value={draft}
                      disabled={saving}
                      aria-label={`Edit ${singular}`}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        if (skipBlurSave.current) {
                          skipBlurSave.current = false
                          return
                        }
                        void commitEdit()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void commitEdit()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelEdit()
                        }
                      }}
                    />
                  ) : (
                    <div className="audion-project-compact-link audion-project-compact-static">
                      <button
                        type="button"
                        className="audion-editable-list-text audion-project-compact-name-btn"
                        onClick={() => beginEdit(row)}
                        disabled={saving}
                      >
                        <span className="audion-project-compact-name">{row.name}</span>
                      </button>
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="audion-project-compact-meta audion-project-compact-meta-link"
                        >
                          {row.meta}
                        </Link>
                      ) : (
                        <span className="audion-project-compact-meta">{row.meta}</span>
                      )}
                    </div>
                  )}
                </div>
                {!isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="audion-edit-icon-btn audion-delete-icon-btn audion-editable-list-delete"
                    aria-label={`Delete ${singular}`}
                    title="Delete"
                    icon={<IconDelete />}
                    disabled={saving}
                    onClick={() => setDeleteId(row.id)}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState>
          {empty}{' '}
          {onCreate && !createSlot ? (
            <button type="button" className="audion-link" onClick={handleAddDraft} disabled={saving}>
              Add one
            </button>
          ) : null}
        </EmptyState>
      )}

      {showAddFoot ? (
        <div className="audion-editable-list-foot">
          <div className="audion-editable-list-foot-inner">
            {createSlot ?? (
              <button
                type="button"
                className="audion-editable-list-add-row"
                aria-label={`Add ${singular}`}
                disabled={saving || editingId != null}
                onClick={handleAddDraft}
              >
                <span className="audion-magazine-list-num" aria-hidden>
                  {nextNum}
                </span>
                <span className="audion-editable-list-add-label">
                  {addLabel ?? `Add ${singular}`}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="audion-editable-list-error" role="alert">
          {error}
        </p>
      ) : null}

      {deleteId != null ? (
        <Dialog
          open
          onClose={() => {
            if (!saving) setDeleteId(null)
          }}
          className="audion-edit-dialog"
          title={`Delete ${singular}?`}
          actions={
            <>
              <Button variant="ghost" size="md" onClick={() => setDeleteId(null)} disabled={saving}>
                Cancel
              </Button>
              <Button size="md" onClick={() => void onConfirmDelete()} disabled={saving}>
                {saving ? 'Deleting…' : 'Delete'}
              </Button>
            </>
          }
        >
          <p>
            Permanently delete <strong>{deleteLabel.trim() || singular}</strong>? This cannot be
            undone.
          </p>
        </Dialog>
      ) : null}
    </Panel>
  )
}

export function ProjectPersonaList({
  projectId,
  personas,
}: {
  projectId: string
  personas: PersonaSummary[]
}) {
  const t = useT()
  const router = useRouter()
  const rows = toPersonaRows(personas)

  return (
    <CompactEditableList
      title={t('detail.project.personas')}
      singular="persona"
      rows={rows}
      empty={
        <>
          No personas in this project yet.{' '}
          <PersonaCreateButton variant="link" projectId={projectId} />
        </>
      }
      createSlot={
        <PersonaCreateButton variant="row" projectId={projectId} nextIndex={rows.length + 1} />
      }
      onRename={async (id, name) => {
        await patchJson(paths.routes.apiPersonaDetail(id), { name })
        router.refresh()
      }}
      onRemove={async (id) => {
        await deleteJson(paths.routes.apiPersonaDetail(id))
        router.refresh()
      }}
    />
  )
}

export function ProjectTargetGroupList({
  projectId,
  targetGroups,
}: {
  projectId: string
  targetGroups: TargetGroupSummary[]
}) {
  const t = useT()
  const router = useRouter()
  const rows = toGroupRows(targetGroups)

  return (
    <CompactEditableList
      title={t('detail.project.targetGroups')}
      singular="target group"
      rows={rows}
      empty={
        <>
          No target groups in this project yet.{' '}
          <TargetGroupCreateButton variant="link" projectId={projectId} />
        </>
      }
      createSlot={
        <TargetGroupCreateButton
          variant="row"
          projectId={projectId}
          nextIndex={rows.length + 1}
        />
      }
      onRename={async (id, name) => {
        await patchJson(paths.routes.apiTargetGroupDetail(id), { name })
        router.refresh()
      }}
      onRemove={async (id) => {
        await deleteJson(paths.routes.apiTargetGroupDetail(id))
        router.refresh()
      }}
    />
  )
}

export function ProjectTeamList({
  projectId,
  members,
}: {
  projectId: string
  members: ProjectMember[]
}) {
  const t = useT()
  const router = useRouter()
  const active = members.filter((m) => m.status !== 'removed')

  async function persistMembers(nextActive: ProjectMember[]) {
    const byId = new Map<string, ProjectMember>()
    for (const m of members) {
      if (!nextActive.some((n) => n.id === m.id)) {
        byId.set(m.id, { ...m, status: 'removed' })
      }
    }
    for (const m of nextActive) byId.set(m.id, m)
    await patchJson(paths.routes.apiProjectDetail(projectId), {
      members: [...byId.values()],
    })
    router.refresh()
  }

  return (
    <CompactEditableList
      title={t('detail.project.team')}
      singular="member"
      rows={toMemberRows(active)}
      empty="No members yet."
      draftMeta="member · invited"
      addLabel="Add member"
      onRename={async (id, email) => {
        await persistMembers(active.map((m) => (m.id === id ? { ...m, email } : m)))
      }}
      onRemove={async (id) => {
        await persistMembers(active.filter((m) => m.id !== id))
      }}
      onCreate={async (email) => {
        const member: ProjectMember = {
          id: `mem-${Date.now().toString(36)}`,
          email,
          role: 'member',
          status: 'invited',
        }
        await persistMembers([...active, member])
      }}
    />
  )
}
