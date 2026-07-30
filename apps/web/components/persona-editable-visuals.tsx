'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  GenerateMoodboardResponse,
  PersonaVisualTile,
  PersonaVisuals,
} from '@audion-v3/contracts'
import { Button, EmptyState, SectionChrome } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflows'
import { paths } from '../lib/paths'
import {
  blankPersonaVisualTile,
  PERSONA_VISUAL_CATEGORIES,
  resolvePersonaVisuals,
  toPersonaWriteVisuals,
} from '../lib/persona-visuals'
import { AiActionButton } from './ai-action-button'

type KeywordMode = { type: 'edit'; index: number } | { type: 'add' } | null

/**
 * Magazine Visuals band — editable style keywords + moodboard tiles (PATCH visuals).
 */
export function PersonaEditableVisuals({
  personaId,
  visuals,
}: {
  personaId: string
  visuals: PersonaVisuals | null
}) {
  const router = useRouter()
  const baseId = useId()
  const keywordRef = useRef<HTMLInputElement>(null)
  const skipBlurSave = useRef(false)
  const [local, setLocal] = useState(() => resolvePersonaVisuals(visuals))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keywordMode, setKeywordMode] = useState<KeywordMode>(null)
  const [keywordDraft, setKeywordDraft] = useState('')
  const [editingTileId, setEditingTileId] = useState<string | null>(null)
  const [tileDraft, setTileDraft] = useState<PersonaVisualTile | null>(null)
  const [deleteTileId, setDeleteTileId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const moodboardHint = targetHint('generateMoodboard')

  useEffect(() => {
    if (keywordMode || editingTileId) return
    setLocal(resolvePersonaVisuals(visuals))
    setError(null)
  }, [visuals, personaId, keywordMode, editingTileId])

  useEffect(() => {
    if (!keywordMode) return
    keywordRef.current?.focus()
    keywordRef.current?.select()
  }, [keywordMode])

  async function persist(next: PersonaVisuals) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visuals: toPersonaWriteVisuals(next) }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setLocal(resolvePersonaVisuals(toPersonaWriteVisuals(next)))
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function beginKeywordEdit(index: number) {
    if (saving || editingTileId) return
    setKeywordMode({ type: 'edit', index })
    setKeywordDraft(local.styleKeywords[index] ?? '')
  }

  function beginKeywordAdd() {
    if (saving || editingTileId || keywordMode) return
    setKeywordMode({ type: 'add' })
    setKeywordDraft('')
  }

  function cancelKeyword() {
    skipBlurSave.current = true
    setKeywordMode(null)
    setKeywordDraft('')
  }

  async function commitKeyword() {
    if (!keywordMode) return
    const trimmed = keywordDraft.trim()
    if (keywordMode.type === 'add') {
      if (!trimmed) {
        setKeywordMode(null)
        setKeywordDraft('')
        return
      }
      const ok = await persist({
        ...local,
        styleKeywords: [...local.styleKeywords, trimmed],
      })
      if (ok) {
        setKeywordMode(null)
        setKeywordDraft('')
      }
      return
    }
    const previous = local.styleKeywords[keywordMode.index] ?? ''
    if (!trimmed) {
      const nextKeywords = local.styleKeywords.filter((_, i) => i !== keywordMode.index)
      const ok = await persist({ ...local, styleKeywords: nextKeywords })
      if (ok) {
        setKeywordMode(null)
        setKeywordDraft('')
      }
      return
    }
    if (trimmed === previous) {
      setKeywordMode(null)
      setKeywordDraft('')
      return
    }
    const nextKeywords = local.styleKeywords.map((k, i) => (i === keywordMode.index ? trimmed : k))
    const ok = await persist({ ...local, styleKeywords: nextKeywords })
    if (ok) {
      setKeywordMode(null)
      setKeywordDraft('')
    }
  }

  function beginTileEdit(tile: PersonaVisualTile) {
    if (saving || keywordMode) return
    setEditingTileId(tile.id)
    setTileDraft({ ...tile })
    setError(null)
  }

  function cancelTileEdit() {
    setEditingTileId(null)
    setTileDraft(null)
  }

  async function commitTileEdit() {
    if (!editingTileId || !tileDraft) return
    const imageUrl = tileDraft.imageUrl.trim()
    if (!imageUrl) {
      setError('Image URL is required')
      return
    }
    const nextTile: PersonaVisualTile = {
      id: tileDraft.id,
      imageUrl,
      category: tileDraft.category.trim() || 'visual',
      caption: tileDraft.caption?.trim() ? tileDraft.caption.trim() : null,
    }
    const previous = local.tiles.find((t) => t.id === editingTileId)
    if (
      previous &&
      previous.imageUrl === nextTile.imageUrl &&
      previous.category === nextTile.category &&
      previous.caption === nextTile.caption
    ) {
      cancelTileEdit()
      return
    }
    const nextTiles = local.tiles.map((t) => (t.id === editingTileId ? nextTile : t))
    const ok = await persist({ ...local, tiles: nextTiles })
    if (ok) cancelTileEdit()
  }

  async function addTile() {
    if (saving || keywordMode || editingTileId) return
    const tile = blankPersonaVisualTile()
    const ok = await persist({ ...local, tiles: [...local.tiles, tile] })
    if (ok) beginTileEdit(tile)
  }

  async function onConfirmDeleteTile() {
    if (!deleteTileId) return
    const nextTiles = local.tiles.filter((t) => t.id !== deleteTileId)
    const ok = await persist({ ...local, tiles: nextTiles })
    if (ok) {
      setDeleteTileId(null)
      if (editingTileId === deleteTileId) cancelTileEdit()
    }
  }

  async function generateMoodboard() {
    if (saving || generating || keywordMode || editingTileId) return
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiGenerateMoodboard(personaId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await response.json().catch(() => null)) as
        | (GenerateMoodboardResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Moodboard failed (${response.status})`)
      if (data?.visuals) {
        setLocal(resolvePersonaVisuals(data.visuals))
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Moodboard failed')
    } finally {
      setGenerating(false)
    }
  }

  const meta = local.tiles.length ? `${local.tiles.length}` : undefined
  const deleteTile = local.tiles.find((t) => t.id === deleteTileId)
  const isEmpty = local.tiles.length === 0 && local.styleKeywords.length === 0
  const categoryOptions = (current: string) => {
    if (PERSONA_VISUAL_CATEGORIES.includes(current as (typeof PERSONA_VISUAL_CATEGORIES)[number])) {
      return [...PERSONA_VISUAL_CATEGORIES]
    }
    return [current, ...PERSONA_VISUAL_CATEGORIES]
  }

  return (
    <section
      className="detail-block audion-magazine-visuals audion-editable-visuals ds-motion-reveal"
      aria-label="Visuals"
    >
      <div className="audion-editable-visuals-chrome">
        <SectionChrome quiet title="Visuals" meta={meta} metaTone="accent" as="h3" />
        <AiActionButton
          label="Generate moodboard"
          targetHint={moodboardHint}
          loading={generating}
          disabled={saving || keywordMode != null || editingTileId != null}
          onClick={() => void generateMoodboard()}
        />
      </div>

      <div className="audion-editable-visuals-keywords" aria-label="Style keywords">
        {local.styleKeywords.map((keyword, index) => {
          const isEditing = keywordMode?.type === 'edit' && keywordMode.index === index
          if (isEditing) {
            return (
              <input
                key={`kw-edit-${index}`}
                ref={keywordRef}
                className="audion-editable-visuals-keyword-input"
                value={keywordDraft}
                disabled={saving}
                aria-label={`Edit style keyword ${index + 1}`}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onBlur={() => {
                  if (skipBlurSave.current) {
                    skipBlurSave.current = false
                    return
                  }
                  void commitKeyword()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelKeyword()
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void commitKeyword()
                  }
                }}
              />
            )
          }
          return (
            <button
              key={`kw-${index}-${keyword}`}
              type="button"
              className="audion-editable-visuals-keyword"
              onClick={() => beginKeywordEdit(index)}
              disabled={saving || editingTileId != null}
            >
              {keyword}
            </button>
          )
        })}
        {keywordMode?.type === 'add' ? (
          <input
            ref={keywordRef}
            className="audion-editable-visuals-keyword-input"
            value={keywordDraft}
            disabled={saving}
            aria-label="New style keyword"
            onChange={(e) => setKeywordDraft(e.target.value)}
            onBlur={() => {
              if (skipBlurSave.current) {
                skipBlurSave.current = false
                return
              }
              void commitKeyword()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                cancelKeyword()
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                void commitKeyword()
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="audion-editable-visuals-keyword audion-editable-visuals-keyword--add"
            onClick={beginKeywordAdd}
            disabled={saving || editingTileId != null || keywordMode != null}
          >
            + Keyword
          </button>
        )}
      </div>

      {isEmpty && !editingTileId ? (
        <button
          type="button"
          className="audion-project-knowledge-empty"
          onClick={() => void addTile()}
          aria-label="Add visual tile"
        >
          <EmptyState>Add moodboard tiles and style keywords for this persona.</EmptyState>
        </button>
      ) : (
        <ul className="audion-magazine-visual-grid">
          {local.tiles.map((tile) => {
            const isEditing = editingTileId === tile.id && tileDraft
            return (
              <li key={tile.id} data-category={tile.category} className="audion-editable-visuals-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tile.imageUrl} alt={tile.caption || tile.category} />
                {tile.caption ? (
                  <span className="audion-magazine-visual-caption">{tile.caption}</span>
                ) : null}

                {isEditing ? (
                  <div className="audion-editable-visuals-tile-editor" onClick={(e) => e.stopPropagation()}>
                    <label className="audion-editable-visuals-field">
                      <span>Category</span>
                      <select
                        id={`${baseId}-cat-${tile.id}`}
                        value={tileDraft.category}
                        disabled={saving}
                        aria-label="Tile category"
                        onChange={(e) => setTileDraft({ ...tileDraft, category: e.target.value })}
                      >
                        {categoryOptions(tileDraft.category).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="audion-editable-visuals-field">
                      <span>Caption</span>
                      <input
                        value={tileDraft.caption ?? ''}
                        disabled={saving}
                        aria-label="Tile caption"
                        onChange={(e) => setTileDraft({ ...tileDraft, caption: e.target.value })}
                      />
                    </label>
                    <label className="audion-editable-visuals-field">
                      <span>Image URL</span>
                      <input
                        value={tileDraft.imageUrl}
                        disabled={saving}
                        aria-label="Tile image URL"
                        onChange={(e) => setTileDraft({ ...tileDraft, imageUrl: e.target.value })}
                      />
                    </label>
                    <div className="audion-editable-visuals-tile-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void commitTileEdit()}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelTileEdit} disabled={saving}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTileId(tile.id)}
                        disabled={saving}
                        aria-label={`Remove ${tile.caption || tile.category}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="audion-editable-visuals-tile-hit"
                    onClick={() => beginTileEdit(tile)}
                    disabled={saving || keywordMode != null}
                    aria-label={`Edit ${tile.caption || tile.category} tile`}
                  />
                )}
              </li>
            )
          })}
          <li className="audion-editable-visuals-tile audion-editable-visuals-tile--add">
            <button
              type="button"
              className="audion-editable-visuals-add-tile"
              onClick={() => void addTile()}
              disabled={saving || keywordMode != null || editingTileId != null}
            >
              <span aria-hidden>+</span>
              <span>Add tile</span>
            </button>
          </li>
        </ul>
      )}

      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}

      <Dialog
        open={deleteTileId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTileId(null)
        }}
        title="Remove visual tile?"
        description={
          deleteTile
            ? `Remove “${deleteTile.caption || deleteTile.category}” from this persona moodboard?`
            : undefined
        }
      >
        <div className="audion-editable-list-dialog-actions">
          <Button type="button" variant="ghost" onClick={() => setDeleteTileId(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirmDeleteTile()} disabled={saving}>
            Remove
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
