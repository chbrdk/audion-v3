'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaSection } from '@audion-v3/contracts'
import { Accordion, Button, EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'
import {
  isEmptyKnowledgeBody,
  knowledgePreviewLine,
  newPersonaNoteId,
  resolvePersonaNotes,
  sanitizeKnowledgeHtml,
  toPersonaWriteSections,
  type PersonaNoteCard,
} from '../lib/persona-notes'
import { useT } from '../lib/user-prefs'
import { KnowledgeRichEditor } from './knowledge-rich-editor'

/**
 * Magazine Notes band — same Accordion + TipTap content cards as
 * `ProjectKnowledgeDossier` (project knowledge chapters).
 */
export function PersonaEditableNotes({
  personaId,
  sections,
}: {
  personaId: string
  sections: PersonaSection[]
}) {
  const t = useT()
  const router = useRouter()
  const titleRef = useRef<HTMLInputElement>(null)
  const skipBlurSave = useRef(false)
  const [notes, setNotes] = useState(() => resolvePersonaNotes(sections))
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [bodyDraft, setBodyDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingId) return
    setNotes(resolvePersonaNotes(sections))
  }, [sections, personaId, editingId])

  async function persist(next: PersonaNoteCard[]) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: toPersonaWriteSections(next) }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setNotes(next)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      throw e
    } finally {
      setSaving(false)
    }
  }

  function onAccordionChange(id: string | null) {
    if (editingId && id !== editingId) return
    setOpenId(id)
  }

  function beginEdit(note: PersonaNoteCard) {
    if (saving) return
    setOpenId(note.id)
    setEditingId(note.id)
    setTitleDraft(note.title)
    setBodyDraft(note.body)
    setError(null)
  }

  function cancelEdit() {
    skipBlurSave.current = true
    const draftNote = notes.find((n) => n.id === editingId)
    if (
      draftNote &&
      !draftNote.title.trim() &&
      isEmptyKnowledgeBody(draftNote.body) &&
      isEmptyKnowledgeBody(bodyDraft)
    ) {
      setNotes((prev) => prev.filter((n) => n.id !== editingId))
    }
    setEditingId(null)
    setTitleDraft('')
    setBodyDraft('')
  }

  async function commitEdit() {
    if (!editingId) return
    const title = titleDraft.trim() || t('common.untitled')
    const body = isEmptyKnowledgeBody(bodyDraft) ? '' : sanitizeKnowledgeHtml(bodyDraft)
    const previous = notes.find((n) => n.id === editingId)
    if (previous && previous.title === title && previous.body === body) {
      setEditingId(null)
      return
    }
    const next = notes.map((n) => (n.id === editingId ? { ...n, title, body } : n))
    try {
      await persist(next)
      setEditingId(null)
    } catch {
      /* error surfaced */
    }
  }

  function onBlurSave() {
    if (skipBlurSave.current) {
      skipBlurSave.current = false
      return
    }
    window.setTimeout(() => {
      const root = document.getElementById(`ds-accordion-panel-${editingId}`)
      if (root?.contains(document.activeElement)) return
      void commitEdit()
    }, 0)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
      return
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void commitEdit()
    }
  }

  async function addNote() {
    if (saving || editingId) return
    const id = newPersonaNoteId()
    const note: PersonaNoteCard = { id, title: t('personaEdit.newNote'), body: '' }
    setNotes((prev) => [...prev, note])
    setOpenId(id)
    setEditingId(id)
    setTitleDraft(note.title)
    setBodyDraft('')
    setError(null)
    window.setTimeout(() => titleRef.current?.select(), 0)
  }

  async function removeNote(id: string) {
    if (saving) return
    const next = notes.filter((n) => n.id !== id)
    try {
      await persist(next)
      if (openId === id) setOpenId(null)
      if (editingId === id) setEditingId(null)
    } catch {
      /* error surfaced */
    }
  }

  return (
    <Panel className="detail-block audion-magazine-band audion-project-knowledge audion-persona-notes ds-motion-reveal">
      <SectionChrome
        quiet
        title={t('personaEdit.notes')}
        meta={notes.length ? `${notes.length}` : undefined}
        metaTone="accent"
        as="h3"
      />

      {notes.length === 0 ? (
        <button
          type="button"
          className="audion-project-knowledge-empty"
          onClick={() => void addNote()}
          aria-label={t('personaEdit.addNote')}
        >
          <EmptyState>
            Add Mindset, Context, and working notes — same content cards as project knowledge.
          </EmptyState>
        </button>
      ) : (
        <Accordion
          aria-label={t('personaEdit.notes')}
          value={openId}
          onChange={onAccordionChange}
          footer={
            <button
              type="button"
              className="audion-knowledge-add"
              onClick={() => void addNote()}
              disabled={saving || editingId != null}
            >
              <span className="audion-magazine-list-num" aria-hidden>
                +
              </span>
              <span>{t('personaEdit.addNote')}</span>
            </button>
          }
          items={notes.map((note) => {
            const isEditing = editingId === note.id
            return {
              id: note.id,
              title: note.title,
              preview: knowledgePreviewLine(note.body),
              panel: (
                <div className="audion-knowledge-panel-inner" onKeyDown={onKeyDown}>
                  {isEditing ? (
                    <input
                      ref={titleRef}
                      className="audion-knowledge-title-input"
                      value={titleDraft}
                      disabled={saving}
                      aria-label={t('personaEdit.notes')}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={onBlurSave}
                    />
                  ) : null}

                  <KnowledgeRichEditor
                    content={isEditing ? bodyDraft : note.body}
                    editable={isEditing}
                    disabled={saving}
                    ariaLabel={`${t('common.edit')} ${note.title}`}
                    placeholder={t('personaEdit.notePh')}
                    onChange={setBodyDraft}
                    onBlur={onBlurSave}
                    onRequestEdit={() => beginEdit(note)}
                    onEscape={cancelEdit}
                    onSaveShortcut={() => void commitEdit()}
                  />

                  <div className="audion-knowledge-actions">
                    {!isEditing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEdit(note)}
                        disabled={saving}
                      >
                        {t('common.edit')}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeNote(note.id)}
                      disabled={saving}
                      aria-label={`${t('common.remove')} ${note.title}`}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>
                </div>
              ),
            }
          })}
        />
      )}

      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
    </Panel>
  )
}
