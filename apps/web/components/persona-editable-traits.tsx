'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, MeterList, Panel, SectionChrome, Slider } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { mergeTraitSuggestions } from '../lib/persona-field-suggest'
import { useT } from '../lib/user-prefs'
import { IconDelete } from './nav-icons'
import { SuggestPersonaFieldButton } from './suggest-persona-field-button'

type TraitRow = {
  key: string
  label: string
  score: number
}

type Props = {
  personaId: string
  traits: Record<string, number>
  className?: string
}

function rowsFromTraits(traits: Record<string, number>): TraitRow[] {
  return Object.entries(traits).map(([label, score], index) => ({
    key: `${label}-${index}`,
    label,
    score: Math.min(1, Math.max(0, score)),
  }))
}

function traitsFromRows(rows: TraitRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const label = row.label.trim()
    if (!label) continue
    out[label] = Math.min(1, Math.max(0, row.score))
  }
  return out
}

function scoreToPct(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100)
}

export function PersonaEditableTraits({ personaId, traits, className }: Props) {
  const t = useT()
  const router = useRouter()
  const baseId = useId()
  const [rows, setRows] = useState(() => rowsFromTraits(traits))
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)
  const rowsRef = useRef(rows)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    setRows(rowsFromTraits(traits))
    setEditingIndex(null)
    setDraft('')
    setError(null)
  }, [traits, personaId])

  useEffect(() => {
    if (editingIndex == null) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingIndex])

  async function persist(nextRows: TraitRow[]) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traits: traitsFromRows(nextRows) }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      const cleaned = nextRows.filter((r) => r.label.trim())
      setRows(cleaned)
      rowsRef.current = cleaned
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function beginLabelEdit(index: number) {
    if (saving) return
    const row = rows[index]
    if (!row) return
    setEditingIndex(index)
    setDraft(row.label)
    setError(null)
  }

  function cancelLabelEdit() {
    skipBlurSave.current = true
    if (editingIndex != null) {
      const row = rows[editingIndex]
      if (row && !row.label.trim()) {
        setRows((prev) => prev.filter((_, i) => i !== editingIndex))
      }
    }
    setEditingIndex(null)
    setDraft('')
  }

  async function commitLabelEdit() {
    if (editingIndex == null) return
    const row = rows[editingIndex]
    if (!row) return
    const trimmed = draft.trim()

    if (!trimmed) {
      if (!row.label.trim()) {
        setRows((prev) => prev.filter((_, i) => i !== editingIndex))
        setEditingIndex(null)
        setDraft('')
        return
      }
      cancelLabelEdit()
      return
    }

    if (trimmed === row.label) {
      setEditingIndex(null)
      setDraft('')
      return
    }

    const duplicate = rows.some(
      (r, i) => i !== editingIndex && r.label.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicate) {
      setError(t('personaEdit.traitUnique'))
      return
    }

    const next = rows.map((r, i) => (i === editingIndex ? { ...r, label: trimmed } : r))
    const ok = await persist(next)
    if (ok) {
      setEditingIndex(null)
      setDraft('')
    }
  }

  function onSliderInput(index: number, pct: number) {
    const score = Math.min(100, Math.max(0, pct)) / 100
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, score } : r)))
  }

  async function onSliderCommit(index: number, pct: number) {
    const score = Math.min(100, Math.max(0, pct)) / 100
    const next = rowsRef.current.map((r, i) => (i === index ? { ...r, score } : r))
    const previous = rowsFromTraits(traits)[index]
    if (previous && Math.abs(previous.score - score) < 0.005 && previous.label === next[index]?.label) {
      return
    }
    await persist(next)
  }

  function onAdd() {
    if (saving || editingIndex != null) return
    const nextIndex = rows.length
    setRows((prev) => [...prev, { key: `new-${Date.now()}`, label: '', score: 0.5 }])
    setEditingIndex(nextIndex)
    setDraft('')
    setError(null)
  }

  async function onConfirmDelete() {
    if (deleteIndex == null) return
    const next = rows.filter((_, i) => i !== deleteIndex)
    const ok = await persist(next)
    if (ok) setDeleteIndex(null)
  }

  const deleteLabel = deleteIndex != null ? rows[deleteIndex]?.label ?? '' : ''
  const filledCount = rows.filter((r) => r.label.trim()).length

  async function acceptSuggestion(title: string) {
    const currentTraits = traitsFromRows(rowsRef.current)
    const nextTraits = mergeTraitSuggestions(currentTraits, [title])
    const nextRows = rowsFromTraits(nextTraits)
    const ok = await persist(nextRows)
    if (!ok) throw new Error('Save failed')
  }

  return (
    <Panel
      className={[
        'detail-block',
        'audion-magazine-band',
        'audion-editable-list',
        'audion-editable-traits',
        'ds-motion-reveal',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <SectionChrome
        quiet
        title={t('personaEdit.traits')}
        meta={`${filledCount}`}
        as="h3"
        action={
          <SuggestPersonaFieldButton
            personaId={personaId}
            field="traits"
            disabled={saving || editingIndex != null}
            onAccept={async (item) => {
              await acceptSuggestion(item.title)
            }}
          />
        }
      />

      {rows.length ? (
        <MeterList className="audion-editable-traits-list" aria-label={t('personaEdit.traits')}>
          {rows.map((row, index) => {
            const pct = scoreToPct(row.score)
            const editingLabel = editingIndex === index
            return (
              <li key={row.key} className="ds-meter audion-editable-traits-row">
                <div className="ds-meter-head audion-editable-traits-row-head">
                  {editingLabel ? (
                    <input
                      ref={inputRef}
                      id={`${baseId}-label-${index}`}
                      className="audion-editable-list-input audion-editable-traits-label-input"
                      value={draft}
                      disabled={saving}
                      aria-label={`Edit trait name ${index + 1}`}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        if (skipBlurSave.current) {
                          skipBlurSave.current = false
                          return
                        }
                        void commitLabelEdit()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void commitLabelEdit()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelLabelEdit()
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="audion-editable-traits-label"
                      onClick={() => beginLabelEdit(index)}
                      disabled={saving}
                    >
                      {row.label || <span className="audion-editable-list-placeholder">Trait name…</span>}
                    </button>
                  )}
                  <span className="ds-meter-value" aria-hidden>
                    {pct}
                  </span>
                  {!editingLabel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="audion-edit-icon-btn audion-delete-icon-btn audion-editable-traits-delete"
                      aria-label={`${t('common.delete')} ${row.label || index + 1}`}
                      title={t('common.delete')}
                      icon={<IconDelete />}
                      disabled={saving}
                      onClick={() => setDeleteIndex(index)}
                    />
                  ) : null}
                </div>
                <Slider
                  value={pct}
                  disabled={saving || !row.label.trim()}
                  aria-label={`Score for ${row.label || `trait ${index + 1}`}`}
                  onChange={(n) => onSliderInput(index, n)}
                  onCommit={(n) => void onSliderCommit(index, n)}
                />
              </li>
            )
          })}
        </MeterList>
      ) : (
        <EmptyState>
          No traits yet.{' '}
          <button type="button" className="audion-link" onClick={onAdd} disabled={saving}>
            Add one
          </button>
        </EmptyState>
      )}

      {rows.length > 0 ? (
        <div className="audion-editable-list-foot">
          <div className="audion-editable-list-foot-inner">
            <button
              type="button"
              className="audion-editable-list-add-row"
              aria-label={t('personaEdit.addTrait')}
              disabled={saving || editingIndex != null}
              onClick={onAdd}
            >
              <span className="audion-magazine-list-num" aria-hidden>
                {String(rows.length + 1).padStart(2, '0')}
              </span>
              <span className="audion-editable-list-add-label">{t('personaEdit.addTrait')}</span>
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
          title={t('personaEdit.deleteTraitConfirm')}
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
            Remove <strong>{deleteLabel.trim() || `trait ${deleteIndex + 1}`}</strong> from traits?
          </p>
        </Dialog>
      ) : null}
    </Panel>
  )
}
