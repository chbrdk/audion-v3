'use client'

import React, { useState } from 'react'
import type { AiSuggestionItem, PersonaSuggestField, SuggestPersonaFieldResponse } from '@audion-v3/contracts'
import { Button } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflow-targets'
import { personaSuggestFieldLabel } from '../lib/persona-field-suggest'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

/**
 * Magazine field AI suggest — opens dialog, accept merges via parent callback.
 * Wave-1 stub; upstream V2 chip / enrich paths documented on `target`.
 */
export function SuggestPersonaFieldButton({
  personaId,
  field,
  label = 'Suggest',
  disabled = false,
  onAccept,
}: {
  personaId: string
  field: PersonaSuggestField
  label?: string
  disabled?: boolean
  /** Called when user accepts one suggestion; parent merges + PATCHes. */
  onAccept: (item: AiSuggestionItem) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([])
  const [hintPath, setHintPath] = useState(targetHint('suggestPersonaField'))
  const fieldLabel = personaSuggestFieldLabel(field)
  const allowAddAll = field !== 'sentenceStructure' && suggestions.length > 1

  async function loadSuggestions() {
    setBusy(true)
    setError(null)
    setSuggestions([])
    try {
      const response = await fetch(paths.routes.apiAiSuggestPersonaField(personaId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, max_suggestions: field === 'sentenceStructure' ? 2 : 4 }),
      })
      const data = (await response.json().catch(() => null)) as
        | (SuggestPersonaFieldResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Suggest failed (${response.status})`)
      setSuggestions(data?.suggestions ?? [])
      if (data?.target?.path) {
        setHintPath(`Stub → ${data.target.method} ${data.target.path}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suggest failed')
    } finally {
      setBusy(false)
    }
  }

  function openDialog() {
    if (disabled || busy) return
    setOpen(true)
    void loadSuggestions()
  }

  async function acceptOne(item: AiSuggestionItem) {
    setAccepting(item.id)
    setError(null)
    try {
      await onAccept(item)
      setSuggestions((prev) => prev.filter((s) => s.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Accept failed')
    } finally {
      setAccepting(null)
    }
  }

  async function acceptAll() {
    if (!suggestions.length) return
    setAccepting('all')
    setError(null)
    try {
      for (const item of suggestions) {
        await onAccept(item)
      }
      setSuggestions([])
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Accept failed')
    } finally {
      setAccepting(null)
    }
  }

  return (
    <>
      <AiActionButton
        label={label}
        targetHint={hintPath}
        loading={busy && open}
        disabled={disabled}
        onClick={openDialog}
      />
      {open ? (
        <Dialog
          open
          onClose={() => {
            if (accepting == null) setOpen(false)
          }}
          className="audion-edit-dialog"
          title={`Suggest ${fieldLabel.toLowerCase()}`}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setOpen(false)}
                disabled={accepting != null}
              >
                Close
              </Button>
              {allowAddAll ? (
                <Button
                  type="button"
                  size="md"
                  onClick={() => void acceptAll()}
                  disabled={accepting != null || busy}
                >
                  {accepting === 'all' ? 'Adding…' : 'Add all'}
                </Button>
              ) : null}
            </>
          }
        >
          <p className="audion-edit-lede">AI recommendations for {fieldLabel.toLowerCase()}.</p>
          <p className="audion-ai-target-hint" title={`Later: ${hintPath}`}>
            Stub · later <code>{hintPath}</code>
          </p>
          {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
          {busy && !suggestions.length ? <p className="audion-edit-lede">Loading suggestions…</p> : null}
          {!busy && !suggestions.length && !error ? (
            <p className="audion-edit-lede">No new suggestions right now.</p>
          ) : null}
          {suggestions.length ? (
            <ul className="audion-ai-suggestions">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <div className="audion-ai-suggestions-copy">
                    <span className="audion-ai-suggestions-title">{item.title}</span>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                  <Button
                    type="button"
                    size="md"
                    variant="ghost"
                    disabled={accepting != null}
                    onClick={() => void acceptOne(item)}
                  >
                    {accepting === item.id ? 'Adding…' : 'Add'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Dialog>
      ) : null}
    </>
  )
}
