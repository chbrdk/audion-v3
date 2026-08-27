'use client'

import React, { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneratePersonaAvatarResponse } from '@audion-v3/contracts'
import { Avatar, Button } from '@msqdx/ui'
import { targetHint } from '../lib/ai-workflow-targets'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { AiActionButton } from './ai-action-button'

/**
 * Magazine hero portrait — click to edit URL; Generate with AI stub (Wave 1).
 */
export function PersonaEditablePortrait({
  personaId,
  name,
  avatarUrl,
}: {
  personaId: string
  name: string
  avatarUrl: string | null
}) {
  const t = useT()
  const router = useRouter()
  const fieldId = useId()
  const [localUrl, setLocalUrl] = useState(avatarUrl)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hint = targetHint('generatePersonaAvatar')

  useEffect(() => {
    if (editing) return
    setLocalUrl(avatarUrl)
    setDraft(avatarUrl ?? '')
    setError(null)
  }, [avatarUrl, personaId, editing])

  async function persist(nextUrl: string | null) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: nextUrl }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setLocalUrl(nextUrl)
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function beginEdit() {
    if (saving || generating) return
    setEditing(true)
    setDraft(localUrl ?? '')
    setError(null)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(localUrl ?? '')
    setError(null)
  }

  async function commitEdit() {
    const trimmed = draft.trim()
    const next = trimmed || null
    if (next === (localUrl ?? null)) {
      cancelEdit()
      return
    }
    const ok = await persist(next)
    if (ok) setEditing(false)
  }

  async function clearPortrait() {
    const ok = await persist(null)
    if (ok) {
      setDraft('')
      setEditing(false)
    }
  }

  async function generateAvatar() {
    if (saving || generating) return
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiGeneratePersonaAvatar(personaId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await response.json().catch(() => null)) as
        | (GeneratePersonaAvatarResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Generate failed (${response.status})`)
      if (!data?.avatarUrl) throw new Error('Generate returned no avatar')
      setLocalUrl(data.avatarUrl)
      setDraft(data.avatarUrl)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <figure className="audion-magazine-portrait audion-editable-portrait">
      <Avatar
        name={name}
        src={localUrl ?? undefined}
        size="lg"
        alt={`${name} portrait`}
      />

      {editing ? (
        <div className="audion-editable-portrait-editor">
          <label className="audion-editable-portrait-field" htmlFor={fieldId}>
            <span>{t('personaEdit.portraitUrl')}</span>
            <input
              id={fieldId}
              value={draft}
              disabled={saving || generating}
              aria-label={t('personaEdit.portraitUrl')}
              placeholder={paths.personaAvatarBasePath}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEdit()
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void commitEdit()
                }
              }}
            />
          </label>
          <div className="audion-editable-portrait-actions">
            <AiActionButton
              label={t('personaEdit.generate')}
              targetHint={hint}
              loading={generating}
              disabled={saving}
              onClick={() => void generateAvatar()}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void commitEdit()}
              disabled={saving || generating}
            >
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving || generating}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void clearPortrait()}
              disabled={saving || generating || !localUrl}
            >
              {t('common.clear')}
            </Button>
          </div>
          <p className="audion-ai-target-hint" title={`Later: ${hint}`}>
            Stub · later <code>{hint}</code>
          </p>
          {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="audion-editable-portrait-hit"
            onClick={beginEdit}
            disabled={saving || generating}
            aria-label={t('personaEdit.editPortrait', { name })}
          />
          <div className="audion-editable-portrait-toolbar">
            <AiActionButton
              label={t('personaEdit.generate')}
              targetHint={hint}
              loading={generating}
              disabled={saving}
              onClick={() => void generateAvatar()}
            />
          </div>
          {error ? <p className="audion-editable-portrait-error">{error}</p> : null}
        </>
      )}
    </figure>
  )
}
