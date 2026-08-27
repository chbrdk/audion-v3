'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaCommunicationStyle } from '@audion-v3/contracts'
import { Button, EmptyState, Panel, SectionChrome, Slider } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { mergeStringSuggestions } from '../lib/persona-field-suggest'
import { useT } from '../lib/user-prefs'
import { SuggestPersonaFieldButton } from './suggest-persona-field-button'

export type CommLayout = 'quote' | 'tone'

type Props = {
  personaId: string
  communicationStyle: PersonaCommunicationStyle | null
  className?: string
}

function normalizeStyle(value: PersonaCommunicationStyle | null): PersonaCommunicationStyle {
  return {
    vocabulary: value?.vocabulary ?? [],
    sentenceStructure: value?.sentenceStructure ?? null,
    skepticismLevel: value?.skepticismLevel ?? 0.5,
  }
}

function scoreToPct(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 50
  return Math.round(Math.min(1, Math.max(0, score)) * 100)
}

function readLayout(): CommLayout {
  if (typeof window === 'undefined') return 'quote'
  try {
    const raw = window.sessionStorage.getItem(paths.commLayoutStorageKey)
    return raw === 'tone' ? 'tone' : 'quote'
  } catch {
    return 'quote'
  }
}

export function PersonaEditableCommunication({ personaId, communicationStyle, className }: Props) {
  const t = useT()
  const router = useRouter()
  const baseId = useId()
  const [layout, setLayout] = useState<CommLayout>('quote')
  const [local, setLocal] = useState(() => normalizeStyle(communicationStyle))
  const [editingStructure, setEditingStructure] = useState(false)
  const [structureDraft, setStructureDraft] = useState('')
  const [editingVocabIndex, setEditingVocabIndex] = useState<number | null>(null)
  const [vocabDraft, setVocabDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteVocabIndex, setDeleteVocabIndex] = useState<number | null>(null)
  const structureRef = useRef<HTMLTextAreaElement | null>(null)
  const vocabRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)
  const localRef = useRef(local)

  useEffect(() => {
    setLayout(readLayout())
  }, [])

  useEffect(() => {
    localRef.current = local
  }, [local])

  useEffect(() => {
    setLocal(normalizeStyle(communicationStyle))
    setEditingStructure(false)
    setEditingVocabIndex(null)
    setError(null)
  }, [communicationStyle, personaId])

  useEffect(() => {
    if (editingStructure) {
      structureRef.current?.focus()
      structureRef.current?.select()
    }
  }, [editingStructure])

  useEffect(() => {
    if (editingVocabIndex == null) return
    vocabRef.current?.focus()
    vocabRef.current?.select()
  }, [editingVocabIndex])

  function chooseLayout(next: CommLayout) {
    setLayout(next)
    try {
      window.sessionStorage.setItem(paths.commLayoutStorageKey, next)
    } catch {
      /* ignore */
    }
  }

  async function persist(next: PersonaCommunicationStyle) {
    setSaving(true)
    setError(null)
    try {
      const payload: PersonaCommunicationStyle = {
        vocabulary: next.vocabulary.map((v) => v.trim()).filter(Boolean),
        sentenceStructure: next.sentenceStructure?.trim() || null,
        skepticismLevel:
          next.skepticismLevel == null ? null : Math.min(1, Math.max(0, next.skepticismLevel)),
      }
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationStyle: payload }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setLocal(payload)
      localRef.current = payload
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function beginStructureEdit() {
    if (saving) return
    setEditingStructure(true)
    setStructureDraft(local.sentenceStructure ?? '')
    setError(null)
  }

  function cancelStructureEdit() {
    skipBlurSave.current = true
    setEditingStructure(false)
    setStructureDraft('')
  }

  async function commitStructureEdit() {
    const trimmed = structureDraft.trim()
    const previous = local.sentenceStructure ?? ''
    if (trimmed === previous) {
      setEditingStructure(false)
      setStructureDraft('')
      return
    }
    const ok = await persist({ ...local, sentenceStructure: trimmed || null })
    if (ok) {
      setEditingStructure(false)
      setStructureDraft('')
    }
  }

  function onSliderInput(pct: number) {
    setLocal((prev) => ({ ...prev, skepticismLevel: Math.min(100, Math.max(0, pct)) / 100 }))
  }

  async function onSliderCommit(pct: number) {
    const skepticismLevel = Math.min(100, Math.max(0, pct)) / 100
    const next = { ...localRef.current, skepticismLevel }
    const prev = normalizeStyle(communicationStyle).skepticismLevel
    if (prev != null && Math.abs(prev - skepticismLevel) < 0.005) return
    await persist(next)
  }

  function beginVocabEdit(index: number) {
    if (saving) return
    setEditingVocabIndex(index)
    setVocabDraft(local.vocabulary[index] ?? '')
    setError(null)
  }

  function cancelVocabEdit() {
    skipBlurSave.current = true
    if (editingVocabIndex != null && !(local.vocabulary[editingVocabIndex] ?? '').trim()) {
      setLocal((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.filter((_, i) => i !== editingVocabIndex),
      }))
    }
    setEditingVocabIndex(null)
    setVocabDraft('')
  }

  async function commitVocabEdit() {
    if (editingVocabIndex == null) return
    const trimmed = vocabDraft.trim()
    const previous = local.vocabulary[editingVocabIndex] ?? ''

    if (!trimmed) {
      if (!previous.trim()) {
        setLocal((prev) => ({
          ...prev,
          vocabulary: prev.vocabulary.filter((_, i) => i !== editingVocabIndex),
        }))
        setEditingVocabIndex(null)
        setVocabDraft('')
        return
      }
      cancelVocabEdit()
      return
    }

    if (trimmed === previous) {
      setEditingVocabIndex(null)
      setVocabDraft('')
      return
    }

    const nextVocab = local.vocabulary.map((item, i) => (i === editingVocabIndex ? trimmed : item))
    const ok = await persist({ ...local, vocabulary: nextVocab })
    if (ok) {
      setEditingVocabIndex(null)
      setVocabDraft('')
    }
  }

  function onAddVocab() {
    if (saving || editingVocabIndex != null || editingStructure) return
    const nextIndex = local.vocabulary.length
    setLocal((prev) => ({ ...prev, vocabulary: [...prev.vocabulary, ''] }))
    setEditingVocabIndex(nextIndex)
    setVocabDraft('')
    setError(null)
  }

  async function onConfirmDeleteVocab() {
    if (deleteVocabIndex == null) return
    const nextVocab = local.vocabulary.filter((_, i) => i !== deleteVocabIndex)
    const ok = await persist({ ...local, vocabulary: nextVocab })
    if (ok) setDeleteVocabIndex(null)
  }

  const skepticismPct = scoreToPct(local.skepticismLevel)
  const vocabCount = local.vocabulary.filter((v) => v.trim()).length
  const deleteLabel = deleteVocabIndex != null ? local.vocabulary[deleteVocabIndex] ?? '' : ''

  function renderStructure(variant: 'quote' | 'caption') {
    if (editingStructure) {
      return (
        <textarea
          ref={structureRef}
          id={`${baseId}-structure`}
          className="audion-editable-comm-structure-input"
          rows={variant === 'quote' ? 3 : 2}
          value={structureDraft}
          disabled={saving}
          aria-label="Edit sentence structure"
          onChange={(e) => setStructureDraft(e.target.value)}
          onBlur={() => {
            if (skipBlurSave.current) {
              skipBlurSave.current = false
              return
            }
            void commitStructureEdit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              cancelStructureEdit()
            }
          }}
        />
      )
    }
    return (
      <button
        type="button"
        className={
          variant === 'quote'
            ? 'audion-editable-comm-quote'
            : 'audion-editable-comm-structure-text audion-editable-comm-caption'
        }
        onClick={beginStructureEdit}
        disabled={saving}
      >
        {local.sentenceStructure || (
          <span className="audion-editable-list-placeholder">{t('personaEdit.speakPh')}</span>
        )}
      </button>
    )
  }

  function renderToneDial() {
    return (
      <div className="audion-editable-comm-dial">
        <div className="audion-editable-comm-dial-labels" aria-hidden>
          <span>{t('personaEdit.open')}</span>
          <span>{t('personaEdit.skeptical')}</span>
        </div>
        <Slider
          className="audion-editable-comm-dial-slider"
          value={skepticismPct}
          disabled={saving}
          aria-label={t('personaEdit.skepticism')}
          onChange={onSliderInput}
          onCommit={(n) => void onSliderCommit(n)}
        />
        <span className="audion-editable-comm-dial-value" aria-hidden>
          {skepticismPct}
        </span>
      </div>
    )
  }

  function renderChips() {
    return (
      <div className="audion-editable-comm-chips">
        <span className="audion-editable-comm-kicker">{t('personaEdit.vocabulary')}</span>
        <ul className="audion-editable-comm-chip-row">
          {local.vocabulary.map((word, index) => {
            const isEditing = editingVocabIndex === index
            return (
              <li key={`${baseId}-chip-${index}`} className="audion-editable-comm-chip">
                {isEditing ? (
                  <input
                    ref={vocabRef}
                    className="audion-editable-list-input audion-editable-comm-chip-input"
                    value={vocabDraft}
                    disabled={saving}
                    aria-label={`Edit vocabulary item ${index + 1}`}
                    onChange={(e) => setVocabDraft(e.target.value)}
                    onBlur={() => {
                      if (skipBlurSave.current) {
                        skipBlurSave.current = false
                        return
                      }
                      void commitVocabEdit()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void commitVocabEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelVocabEdit()
                      }
                    }}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className="audion-editable-comm-chip-term"
                      onClick={() => beginVocabEdit(index)}
                      disabled={saving}
                    >
                      {word || '…'}
                    </button>
                    <button
                      type="button"
                      className="audion-editable-comm-chip-remove"
                      aria-label={`Delete vocabulary item ${index + 1}`}
                      disabled={saving}
                      onClick={() => setDeleteVocabIndex(index)}
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            )
          })}
          <li>
            <button
              type="button"
              className="audion-editable-comm-chip-add"
              aria-label="Add vocabulary item"
              disabled={saving || editingVocabIndex != null || editingStructure}
              onClick={onAddVocab}
            >
              + Add
            </button>
          </li>
        </ul>
        {!local.vocabulary.length ? (
          <EmptyState>
            No vocabulary yet.{' '}
            <button type="button" className="audion-link" onClick={onAddVocab} disabled={saving}>
              Add one
            </button>
          </EmptyState>
        ) : null}
      </div>
    )
  }

  return (
    <Panel
      className={[
        'detail-block',
        'audion-magazine-band',
        'audion-editable-list',
        'audion-editable-comm',
        `audion-editable-comm--${layout}`,
        'ds-motion-reveal',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="audion-editable-comm-chrome">
        <SectionChrome
          quiet
          title={t('personaEdit.communication')}
          meta={`${vocabCount}`}
          as="h3"
          action={
            <div className="audion-editable-comm-ai-actions">
              <SuggestPersonaFieldButton
                personaId={personaId}
                field="vocabulary"
                label={t('personaEdit.suggestVocab')}
                disabled={saving || editingVocabIndex != null || editingStructure}
                onAccept={async (item) => {
                  const current = localRef.current
                  const vocabulary = mergeStringSuggestions(current.vocabulary, [item.title])
                  const ok = await persist({ ...current, vocabulary })
                  if (!ok) throw new Error('Save failed')
                }}
              />
              <SuggestPersonaFieldButton
                personaId={personaId}
                field="sentenceStructure"
                label={t('personaEdit.suggestStructure')}
                disabled={saving || editingVocabIndex != null || editingStructure}
                onAccept={async (item) => {
                  const current = localRef.current
                  const ok = await persist({
                    ...current,
                    sentenceStructure: item.title.trim() || null,
                  })
                  if (!ok) throw new Error('Save failed')
                }}
              />
            </div>
          }
        />
        <div className="audion-editable-comm-layout-switch" role="group" aria-label={t('personaEdit.commLayout')}>
          <button
            type="button"
            className={layout === 'quote' ? 'is-active' : undefined}
            aria-pressed={layout === 'quote'}
            onClick={() => chooseLayout('quote')}
          >
            {t('personaEdit.quote')}
          </button>
          <button
            type="button"
            className={layout === 'tone' ? 'is-active' : undefined}
            aria-pressed={layout === 'tone'}
            onClick={() => chooseLayout('tone')}
          >
            {t('personaEdit.tone')}
          </button>
        </div>
      </div>

      {layout === 'quote' ? (
        <div className="audion-editable-comm-layout audion-editable-comm-layout--quote">
          <figure className="audion-editable-comm-quote-block">
            <span className="audion-editable-comm-kicker">{t('personaEdit.howTheySpeak')}</span>
            {renderStructure('quote')}
          </figure>
          {renderChips()}
        </div>
      ) : (
        <div className="audion-editable-comm-layout audion-editable-comm-layout--tone">
          {renderStructure('caption')}
          <div className="audion-editable-comm-tone-block">
            <span className="audion-editable-comm-kicker">{t('personaEdit.toneDial')}</span>
            {renderToneDial()}
          </div>
          {renderChips()}
        </div>
      )}

      {error ? (
        <p className="audion-editable-list-error" role="alert">
          {error}
        </p>
      ) : null}

      {deleteVocabIndex != null ? (
        <Dialog
          open
          onClose={() => {
            if (!saving) setDeleteVocabIndex(null)
          }}
          className="audion-edit-dialog"
          title={t('personaEdit.deleteVocabConfirm')}
          actions={
            <>
              <Button variant="ghost" size="md" onClick={() => setDeleteVocabIndex(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onConfirmDeleteVocab()} disabled={saving}>
                {saving ? t('common.deleting') : t('common.delete')}
              </Button>
            </>
          }
        >
          <p>
            Remove <strong>{deleteLabel.trim() || `item ${deleteVocabIndex + 1}`}</strong> from vocabulary?
          </p>
        </Dialog>
      ) : null}
    </Panel>
  )
}
