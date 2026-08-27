'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectKnowledgeChapter } from '@audion-v3/contracts'
import { Accordion, Button, EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import {
  isEmptyKnowledgeBody,
  joinCompanyContext,
  knowledgePreviewLine,
  newKnowledgeChapterId,
  resolveKnowledgeChapters,
  sanitizeKnowledgeHtml,
} from '../lib/project-knowledge'
import { KnowledgeRichEditor } from './knowledge-rich-editor'
import { KnowledgeRagStatusBadge, useKnowledgeRagStatus } from './knowledge-rag-status'
import { PublishKnowledgePackCta } from './publish-knowledge-pack-cta'

export function ProjectKnowledgeDossier({
  projectId,
  companyContext,
  knowledgeChapters,
  platformProjectId,
}: {
  projectId: string
  companyContext: string | null
  knowledgeChapters?: ProjectKnowledgeChapter[]
  platformProjectId?: string | null
}) {
  const t = useT()
  const router = useRouter()
  const titleRef = useRef<HTMLInputElement>(null)
  const skipBlurSave = useRef(false)
  const [chapters, setChapters] = useState(() =>
    resolveKnowledgeChapters(knowledgeChapters, companyContext),
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [bodyDraft, setBodyDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { bySourceRef: ragByRef, refresh: refreshRag } = useKnowledgeRagStatus(projectId)

  useEffect(() => {
    if (editingId) return
    setChapters(resolveKnowledgeChapters(knowledgeChapters, companyContext))
  }, [knowledgeChapters, companyContext, editingId])

  async function persist(next: ProjectKnowledgeChapter[]) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiProjectDetail(projectId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgeChapters: next,
          companyContext: joinCompanyContext(next),
        }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setChapters(next)
      router.refresh()
      window.setTimeout(() => void refreshRag(), 800)
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

  function beginEdit(chapter: ProjectKnowledgeChapter) {
    if (saving) return
    setOpenId(chapter.id)
    setEditingId(chapter.id)
    setTitleDraft(chapter.title)
    setBodyDraft(chapter.body)
    setError(null)
  }

  function cancelEdit() {
    skipBlurSave.current = true
    const draftChapter = chapters.find((c) => c.id === editingId)
    if (
      draftChapter &&
      !draftChapter.title.trim() &&
      isEmptyKnowledgeBody(draftChapter.body) &&
      isEmptyKnowledgeBody(bodyDraft)
    ) {
      setChapters((prev) => prev.filter((c) => c.id !== editingId))
    }
    setEditingId(null)
    setTitleDraft('')
    setBodyDraft('')
  }

  async function commitEdit() {
    if (!editingId) return
    const title = titleDraft.trim() || 'Untitled'
    const body = isEmptyKnowledgeBody(bodyDraft) ? '' : sanitizeKnowledgeHtml(bodyDraft)
    const previous = chapters.find((c) => c.id === editingId)
    if (previous && previous.title === title && previous.body === body) {
      setEditingId(null)
      return
    }
    const next = chapters.map((c) => (c.id === editingId ? { ...c, title, body } : c))
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

  async function addChapter() {
    if (saving || editingId) return
    const id = newKnowledgeChapterId()
    const chapter: ProjectKnowledgeChapter = { id, title: 'New chapter', body: '' }
    setChapters((prev) => [...prev, chapter])
    setOpenId(id)
    setEditingId(id)
    setTitleDraft(chapter.title)
    setBodyDraft('')
    setError(null)
    window.setTimeout(() => titleRef.current?.select(), 0)
  }

  async function removeChapter(id: string) {
    if (saving) return
    const next = chapters.filter((c) => c.id !== id)
    try {
      await persist(next)
      if (openId === id) setOpenId(null)
      if (editingId === id) setEditingId(null)
    } catch {
      /* error surfaced */
    }
  }

  return (
    <Panel className="stage-panel audion-magazine-band audion-project-knowledge ds-motion-reveal">
      <SectionChrome
        quiet
        title={t('detail.project.knowledge')}
        meta={chapters.length ? `${chapters.length}` : undefined}
        metaTone="accent"
        as="h3"
      />
      <PublishKnowledgePackCta
        projectId={projectId}
        platformProjectId={platformProjectId}
      />
      <p className="audion-knowledge-rag-hint">{t('knowledge.ragHint')}</p>

      {chapters.length === 0 ? (
        <button
          type="button"
          className="audion-project-knowledge-empty"
          onClick={() => void addChapter()}
          aria-label="Add knowledge chapter"
        >
          <EmptyState>
            Add chapters for company, market, voice, and constraints — collapse what you do not need
            right now.
          </EmptyState>
        </button>
      ) : (
        <Accordion
          aria-label="Project knowledge chapters"
          value={openId}
          onChange={onAccordionChange}
          footer={
            <button
              type="button"
              className="audion-knowledge-add"
              onClick={() => void addChapter()}
              disabled={saving || editingId != null}
            >
              <span className="audion-magazine-list-num" aria-hidden>
                +
              </span>
              <span>{t('detail.project.addChapter')}</span>
            </button>
          }
          items={chapters.map((chapter) => {
            const isEditing = editingId === chapter.id
            const rag = ragByRef[chapter.id]
            return {
              id: chapter.id,
              title: chapter.title,
              preview: knowledgePreviewLine(chapter.body),
              panel: (
                <div className="audion-knowledge-panel-inner" onKeyDown={onKeyDown}>
                  {isEditing ? (
                    <input
                      ref={titleRef}
                      className="audion-knowledge-title-input"
                      value={titleDraft}
                      disabled={saving}
                      aria-label="Chapter title"
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={onBlurSave}
                    />
                  ) : null}

                  <KnowledgeRichEditor
                    content={isEditing ? bodyDraft : chapter.body}
                    editable={isEditing}
                    disabled={saving}
                    ariaLabel={`Edit ${chapter.title}`}
                    onChange={setBodyDraft}
                    onBlur={onBlurSave}
                    onRequestEdit={() => beginEdit(chapter)}
                    onEscape={cancelEdit}
                    onSaveShortcut={() => void commitEdit()}
                  />

                  <div className="audion-knowledge-actions">
                    <KnowledgeRagStatusBadge status={rag?.status} />
                    {!isEditing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEdit(chapter)}
                        disabled={saving}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeChapter(chapter.id)}
                      disabled={saving}
                      aria-label={`Remove ${chapter.title}`}
                    >
                      Remove
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
