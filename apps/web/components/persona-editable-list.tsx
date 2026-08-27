'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaFrustration, PersonaGoal } from '@audion-v3/contracts'
import { Button, EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import {
  mergeFrustrationSuggestions,
  mergeGoalSuggestions,
  mergeStringSuggestions,
} from '../lib/persona-field-suggest'
import { useT } from '../lib/user-prefs'
import { IconDelete } from './nav-icons'
import { SuggestPersonaFieldButton } from './suggest-persona-field-button'

export type PersonaListField = 'goals' | 'frustrations' | 'interests' | 'values'

type RichItem = PersonaGoal | PersonaFrustration
type ListItem = RichItem | string

type Props = {
  personaId: string
  field: PersonaListField
  title: string
  items: ListItem[]
  empty: string
  className?: string
}

function isStringField(field: PersonaListField): field is 'interests' | 'values' {
  return field === 'interests' || field === 'values'
}

function itemLabel(item: ListItem | undefined): string {
  if (item == null) return ''
  return typeof item === 'string' ? item : item.label
}

function blankItem(field: PersonaListField): ListItem {
  if (isStringField(field)) return ''
  return field === 'goals' ? { label: '', priority: 0 } : { label: '', evidenceCount: 0 }
}

function withLabel(item: ListItem, label: string, field: PersonaListField, index: number): ListItem {
  if (isStringField(field)) return label
  if (field === 'goals') {
    const goal = (typeof item === 'object' ? item : null) as PersonaGoal | null
    return { label, priority: typeof goal?.priority === 'number' ? goal.priority : index }
  }
  const pain = (typeof item === 'object' ? item : null) as PersonaFrustration | null
  return {
    label,
    evidenceCount: typeof pain?.evidenceCount === 'number' ? pain.evidenceCount : 0,
  }
}

export function PersonaEditableList({
  personaId,
  field,
  title,
  items,
  empty,
  className,
}: Props) {
  const t = useT()
  const router = useRouter()
  const baseId = useId()
  const [localItems, setLocalItems] = useState(items)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)
  const localRef = useRef(localItems)

  useEffect(() => {
    localRef.current = localItems
  }, [localItems])

  useEffect(() => {
    setLocalItems(items)
    setEditingIndex(null)
    setDraft('')
    setError(null)
  }, [items, personaId, field])

  useEffect(() => {
    if (editingIndex == null) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingIndex])

  async function persist(nextItems: ListItem[]) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: nextItems }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setLocalItems(nextItems)
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(index: number) {
    if (saving) return
    setEditingIndex(index)
    setDraft(itemLabel(localItems[index]))
    setError(null)
  }

  function cancelEdit() {
    skipBlurSave.current = true
    const wasDraft = editingIndex != null && !itemLabel(localItems[editingIndex]).trim()
    if (wasDraft && editingIndex != null) {
      setLocalItems((prev) => prev.filter((_, i) => i !== editingIndex))
    }
    setEditingIndex(null)
    setDraft('')
  }

  async function commitEdit() {
    if (editingIndex == null) return
    const trimmed = draft.trim()
    const previous = itemLabel(localItems[editingIndex])

    if (!trimmed) {
      if (!previous.trim()) {
        setLocalItems((prev) => prev.filter((_, i) => i !== editingIndex))
        setEditingIndex(null)
        setDraft('')
        return
      }
      cancelEdit()
      return
    }

    if (trimmed === previous) {
      setEditingIndex(null)
      setDraft('')
      return
    }

    const next = localItems.map((item, i) =>
      i === editingIndex ? withLabel(item, trimmed, field, i) : item,
    )
    const ok = await persist(next)
    if (ok) {
      setEditingIndex(null)
      setDraft('')
    }
  }

  function onAdd() {
    if (saving || editingIndex != null) return
    const nextIndex = localItems.length
    setLocalItems((prev) => [...prev, blankItem(field)])
    setEditingIndex(nextIndex)
    setDraft('')
    setError(null)
  }

  async function onConfirmDelete() {
    if (deleteIndex == null) return
    const next = localItems.filter((_, i) => i !== deleteIndex)
    const ok = await persist(next)
    if (ok) setDeleteIndex(null)
  }

  async function acceptSuggestion(title: string) {
    const current = localRef.current
    let next: ListItem[]
    if (field === 'interests' || field === 'values') {
      next = mergeStringSuggestions(current as string[], [title])
    } else if (field === 'goals') {
      next = mergeGoalSuggestions(current as PersonaGoal[], [title])
    } else {
      next = mergeFrustrationSuggestions(current as PersonaFrustration[], [title])
    }
    const ok = await persist(next)
    if (!ok) throw new Error('Save failed')
    localRef.current = next
  }

  const deleteLabel = deleteIndex != null ? itemLabel(localItems[deleteIndex]) : ''
  const singular =
    field === 'interests'
      ? 'interest'
      : field === 'values'
        ? 'value'
        : title.toLowerCase().replace(/s$/, '')
  const nextNum = String(localItems.length + 1).padStart(2, '0')
  const filledCount = localItems.filter((i) => itemLabel(i).trim()).length

  return (
    <Panel
      className={['stage-panel', 'audion-magazine-band', 'audion-editable-list', className]
        .filter(Boolean)
        .join(' ')}
    >
      <SectionChrome
        quiet
        title={title}
        meta={`${filledCount}`}
        as="h3"
        action={
          <SuggestPersonaFieldButton
            personaId={personaId}
            field={field}
            disabled={saving || editingIndex != null}
            onAccept={async (item) => {
              await acceptSuggestion(item.title)
            }}
          />
        }
      />

      {localItems.length ? (
        <ol className="audion-magazine-list audion-editable-list-items">
          {localItems.map((item, index) => {
            const isEditing = editingIndex === index
            const inputId = `${baseId}-${field}-${index}`
            const label = itemLabel(item)
            return (
              <li key={`${field}-${index}`} className="audion-editable-list-row">
                <span className="audion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="audion-editable-list-main">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      id={inputId}
                      className="audion-editable-list-input"
                      value={draft}
                      disabled={saving}
                      aria-label={`Edit ${title.toLowerCase()} item ${index + 1}`}
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
                    <button
                      type="button"
                      className="audion-editable-list-text"
                      onClick={() => beginEdit(index)}
                      disabled={saving}
                    >
                      {label || <span className="audion-editable-list-placeholder">Add text…</span>}
                    </button>
                  )}
                </div>
                {!isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="audion-edit-icon-btn audion-delete-icon-btn audion-editable-list-delete"
                    aria-label={`${t('common.delete')} ${title.toLowerCase()} item ${index + 1}`}
                    title={t('common.delete')}
                    icon={<IconDelete />}
                    disabled={saving}
                    onClick={() => setDeleteIndex(index)}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState>
          {empty}{' '}
          <button type="button" className="audion-link" onClick={onAdd} disabled={saving}>
            Add one
          </button>
        </EmptyState>
      )}

      {localItems.length > 0 ? (
        <div className="audion-editable-list-foot">
          <div className="audion-editable-list-foot-inner">
            <button
              type="button"
              className="audion-editable-list-add-row"
              aria-label={`Add ${singular}`}
              disabled={saving || editingIndex != null}
              onClick={onAdd}
            >
              <span className="audion-magazine-list-num" aria-hidden>
                {nextNum}
              </span>
              <span className="audion-editable-list-add-label">{t('personaEdit.addItem')}</span>
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="audion-editable-list-error" role="alert">
          {error}
        </p>
      ) : null}

      {deleteIndex != null ? (
        <Dialog
          open
          onClose={() => {
            if (!saving) setDeleteIndex(null)
          }}
          className="audion-edit-dialog"
          title={t('personaEdit.deleteSingularConfirm', { singular })}
          actions={
            <>
              <Button variant="ghost" size="md" onClick={() => setDeleteIndex(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onConfirmDelete()} disabled={saving}>
                {saving ? t('common.deleting') : t('common.delete')}
              </Button>
            </>
          }
        >
          <p>
            Remove <strong>{deleteLabel.trim() || `item ${deleteIndex + 1}`}</strong> from{' '}
            {title.toLowerCase()}?
          </p>
        </Dialog>
      ) : null}
    </Panel>
  )
}
