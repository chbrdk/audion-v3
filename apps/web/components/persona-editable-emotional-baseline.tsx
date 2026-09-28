'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type Props = {
  personaId: string
  emotionalBaseline: string | null
  className?: string
}

/** Single-line magazine band for emotional baseline — same chrome as editable lists. */
export function PersonaEditableEmotionalBaseline({
  personaId,
  emotionalBaseline,
  className,
}: Props) {
  const t = useT()
  const router = useRouter()
  const baseId = useId()
  const [value, setValue] = useState(emotionalBaseline ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)

  useEffect(() => {
    setValue(emotionalBaseline ?? '')
    setEditing(false)
    setDraft('')
    setError(null)
  }, [personaId, emotionalBaseline])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  async function persist(next: string | null) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotionalBaseline: next }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `Save failed (${response.status})`)
      }
      setValue(next ?? '')
      router.refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function beginEdit() {
    if (saving) return
    setEditing(true)
    setDraft(value)
    setError(null)
  }

  function cancelEdit() {
    skipBlurSave.current = true
    setEditing(false)
    setDraft('')
  }

  async function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed === value.trim()) {
      setEditing(false)
      setDraft('')
      return
    }
    const ok = await persist(trimmed || null)
    if (ok) {
      setEditing(false)
      setDraft('')
    }
  }

  const filled = Boolean(value.trim())

  return (
    <Panel
      className={['stage-panel', 'audion-magazine-band', 'audion-editable-list', className]
        .filter(Boolean)
        .join(' ')}
    >
      <SectionChrome
        quiet
        title={t('personaEdit.emotionalBaseline')}
        meta={filled ? '1' : '0'}
        as="h3"
      />

      {filled || editing ? (
        <ol className="audion-magazine-list audion-editable-list-items">
          <li className="audion-editable-list-row">
            <span className="audion-magazine-list-num" aria-hidden>
              01
            </span>
            <div className="audion-editable-list-main">
              {editing ? (
                <input
                  ref={inputRef}
                  id={`${baseId}-baseline`}
                  className="audion-editable-list-input"
                  value={draft}
                  disabled={saving}
                  aria-label={t('personaEdit.emotionalBaseline')}
                  placeholder="e.g. cautious-optimistic"
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
                  onClick={beginEdit}
                  disabled={saving}
                >
                  {value}
                </button>
              )}
            </div>
          </li>
        </ol>
      ) : (
        <>
          <EmptyState>{t('personaEdit.emptyEmotionalBaseline')}</EmptyState>
          <div className="audion-editable-list-foot">
            <div className="audion-editable-list-foot-inner">
              <button
                type="button"
                className="audion-editable-list-add-row"
                aria-label={t('personaEdit.setEmotionalBaseline')}
                disabled={saving}
                onClick={beginEdit}
              >
                <span className="audion-magazine-list-num" aria-hidden>
                  01
                </span>
                <span className="audion-editable-list-add-label">{t('personaEdit.setEmotionalBaseline')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {error ? (
        <p className="audion-editable-list-error" role="alert">
          {error}
        </p>
      ) : null}
    </Panel>
  )
}
