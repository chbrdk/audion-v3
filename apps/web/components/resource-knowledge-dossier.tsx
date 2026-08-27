'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocumentSource, KnowledgeEntry } from '@audion-v3/contracts'
import { Accordion, Button, EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import {
  isEmptyKnowledgeBody,
  knowledgePreviewLine,
  sanitizeKnowledgeHtml,
} from '../lib/project-knowledge'
import { useT } from '../lib/user-prefs'
import { KnowledgeRichEditor } from './knowledge-rich-editor'

function newEntryId(): string {
  return `know-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Shared magazine knowledge Accordion for TG / persona (V2 knowledge CRUD).
 * Persists via listUrl GET/POST/PUT/DELETE or PATCH of parent with knowledgeEntries.
 */
export function ResourceKnowledgeDossier({
  title,
  entries = [],
  documents = [],
  listUrl,
}: {
  title?: string
  entries?: KnowledgeEntry[]
  documents?: DocumentSource[]
  /** GET list · POST create; PUT/DELETE use `${listUrl}/${entryId}` */
  listUrl: string
}) {
  const t = useT()
  const resolvedTitle = title ?? t('knowledge.title')
  const entryUrl = (entryId: string) => `${listUrl}/${entryId}`
  const router = useRouter()
  const titleRef = useRef<HTMLInputElement>(null)
  const skipBlurSave = useRef(false)
  const [items, setItems] = useState(entries)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [bodyDraft, setBodyDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingId) return
    setItems(entries)
  }, [entries, editingId])

  async function createRemote(entry: KnowledgeEntry) {
    const response = await fetch(listUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: entry.title, content: entry.content }),
    })
    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(err?.error || `Create failed (${response.status})`)
    }
    return (await response.json()) as KnowledgeEntry
  }

  async function updateRemote(entry: KnowledgeEntry) {
    const response = await fetch(entryUrl(entry.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: entry.title, content: entry.content }),
    })
    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(err?.error || `Save failed (${response.status})`)
    }
    return (await response.json()) as KnowledgeEntry
  }

  async function deleteRemote(id: string) {
    const response = await fetch(entryUrl(id), { method: 'DELETE' })
    if (!response.ok && response.status !== 404) {
      const err = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(err?.error || `Delete failed (${response.status})`)
    }
  }

  function onAccordionChange(id: string | null) {
    if (editingId && id !== editingId) return
    setOpenId(id)
  }

  function beginEdit(entry: KnowledgeEntry) {
    if (saving) return
    setOpenId(entry.id)
    setEditingId(entry.id)
    setTitleDraft(entry.title)
    setBodyDraft(entry.content)
    setError(null)
  }

  function cancelEdit() {
    skipBlurSave.current = true
    const draft = items.find((c) => c.id === editingId)
    if (
      draft &&
      !draft.title.trim() &&
      isEmptyKnowledgeBody(draft.content) &&
      isEmptyKnowledgeBody(bodyDraft)
    ) {
      setItems((prev) => prev.filter((c) => c.id !== editingId))
    }
    setEditingId(null)
    setTitleDraft('')
    setBodyDraft('')
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

  async function commitEdit() {
    if (!editingId) return
    const titleText = titleDraft.trim() || t('common.untitled')
    const body = isEmptyKnowledgeBody(bodyDraft) ? '' : sanitizeKnowledgeHtml(bodyDraft)
    const previous = items.find((c) => c.id === editingId)
    if (previous && previous.title === titleText && previous.content === body) {
      setEditingId(null)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const isNew = previous && !entries.some((e) => e.id === editingId)
      const payload: KnowledgeEntry = {
        id: editingId,
        title: titleText,
        content: body,
        updatedAt: new Date().toISOString(),
      }
      const saved = isNew ? await createRemote(payload) : await updateRemote(payload)
      setItems((prev) => prev.map((c) => (c.id === editingId ? saved : c)))
      if (isNew && saved.id !== editingId) {
        setOpenId(saved.id)
      }
      setEditingId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function addEntry() {
    if (saving || editingId) return
    const entry: KnowledgeEntry = {
      id: newEntryId(),
      title: t('knowledge.newEntry'),
      content: '',
      updatedAt: null,
    }
    setItems((prev) => [...prev, entry])
    setOpenId(entry.id)
    setEditingId(entry.id)
    setTitleDraft(entry.title)
    setBodyDraft('')
    setError(null)
    window.setTimeout(() => titleRef.current?.select(), 0)
  }

  async function removeEntry(id: string) {
    if (saving) return
    const existsRemote = entries.some((e) => e.id === id)
    setSaving(true)
    setError(null)
    try {
      if (existsRemote) await deleteRemote(id)
      setItems((prev) => prev.filter((c) => c.id !== id))
      if (openId === id) setOpenId(null)
      if (editingId === id) setEditingId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel className="stage-panel audion-magazine-band audion-resource-knowledge ds-motion-reveal">
      <SectionChrome
        quiet
        title={resolvedTitle}
        meta={items.length ? `${items.length}` : undefined}
        metaTone="accent"
        as="h3"
      />

      {items.length === 0 ? (
        <button
          type="button"
          className="audion-project-knowledge-empty"
          onClick={() => void addEntry()}
          aria-label={t('knowledge.addEntry')}
        >
          <EmptyState>{t('knowledge.addCards')}</EmptyState>
        </button>
      ) : (
        <Accordion
          aria-label={resolvedTitle}
          value={openId}
          onChange={onAccordionChange}
          footer={
            <button
              type="button"
              className="audion-knowledge-add"
              onClick={() => void addEntry()}
              disabled={saving || editingId != null}
            >
              <span className="audion-magazine-list-num" aria-hidden>
                +
              </span>
              <span>{t('knowledge.addEntry')}</span>
            </button>
          }
          items={items.map((entry) => {
            const isEditing = editingId === entry.id
            return {
              id: entry.id,
              title: entry.title || t('common.untitled'),
              preview: knowledgePreviewLine(entry.content),
              panel: (
                <div className="audion-knowledge-panel-inner" onKeyDown={onKeyDown}>
                  {isEditing ? (
                    <input
                      ref={titleRef}
                      className="audion-knowledge-title-input"
                      value={titleDraft}
                      disabled={saving}
                      aria-label={t('knowledge.title')}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={onBlurSave}
                    />
                  ) : null}

                  <KnowledgeRichEditor
                    content={isEditing ? bodyDraft : entry.content}
                    editable={isEditing}
                    disabled={saving}
                    ariaLabel={`${t('common.edit')} ${entry.title || t('knowledge.newEntry')}`}
                    onChange={setBodyDraft}
                    onBlur={onBlurSave}
                    onRequestEdit={() => beginEdit(entry)}
                    onEscape={cancelEdit}
                    onSaveShortcut={() => void commitEdit()}
                  />

                  <div className="audion-knowledge-actions">
                    {!isEditing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEdit(entry)}
                        disabled={saving}
                      >
                        {t('common.edit')}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeEntry(entry.id)}
                      disabled={saving}
                      aria-label={`${t('common.remove')} ${entry.title || t('knowledge.newEntry')}`}
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

      {documents.length ? (
        <div className="audion-resource-documents" aria-label={t('knowledge.sources')}>
          <SectionChrome quiet title={t('knowledge.sources')} meta={`${documents.length}`} as="h3" />
          <ul className="audion-research-events">
            {documents.map((doc) => (
              <li key={doc.id}>
                <code>{doc.status}</code> — {doc.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
    </Panel>
  )
}
