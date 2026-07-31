'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EnrichPersonaResponse } from '@audion-v3/contracts'
import { ConfirmDialog } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflow-targets'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

/**
 * Magazine topbar — batch enrich facets (interests/values/goals/frustrations/traits).
 * Confirm before apply (HITL); Wave-2 live/stub via paths.routes.apiAiEnrichPersona.
 */
export function EnrichPersonaButton({
  personaId,
  personaName,
}: {
  personaId: string
  personaName: string
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFacets, setLastFacets] = useState<string[]>([])
  const hint = targetHint('enrichPersona')

  async function runEnrich() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiEnrichPersona(personaId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output_locale: 'en' }),
      })
      const data = (await response.json().catch(() => null)) as
        | (EnrichPersonaResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Enrich failed (${response.status})`)
      setLastFacets(data?.facetsUpdated ?? [])
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrich failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AiActionButton
        label="Enrich with AI"
        targetHint={hint}
        loading={busy}
        onClick={() => {
          setError(null)
          setConfirmOpen(true)
        }}
      />
      {lastFacets.length ? (
        <span className="audion-ai-target-hint" aria-live="polite">
          Updated {lastFacets.join(', ')}
        </span>
      ) : null}
      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
      {confirmOpen ? (
        <ConfirmDialog
          open
          title={`Enrich ${personaName}?`}
          confirmLabel="Enrich"
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void runEnrich()}
        >
          <p>
            AI will deepen interests, values, goals, frustrations, and traits from the current
            brief. Existing chips are merged, not wiped.
          </p>
          <p className="audion-ai-target-hint" title={hint}>
            Target <code>{hint}</code>
          </p>
        </ConfirmDialog>
      ) : null}
    </>
  )
}
