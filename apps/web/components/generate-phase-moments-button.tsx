'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GenerateJourneyPhaseMomentsResponse, JourneyPhase } from '@audion-v3/contracts'
import { ConfirmDialog } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflow-targets'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

/** Phase slide / edit — generate moments via journey.moments (Wave 2). */
export function GeneratePhaseMomentsButton({
  journeyId,
  phase,
  onApplied,
}: {
  journeyId: string
  phase: JourneyPhase
  /** Optional: sync local editors (e.g. TagInput) after apply */
  onApplied?: (labels: string[]) => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hint = targetHint('generateJourneyPhaseMoments')
  const hasMoments = phase.elements.length > 0

  async function runGenerate() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiGenerateJourneyPhaseMoments(journeyId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phase.id, max_suggestions: 4 }),
      })
      const data = (await response.json().catch(() => null)) as
        | (GenerateJourneyPhaseMomentsResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Generate failed (${response.status})`)
      if (data?.moments) onApplied?.(data.moments.map((m) => m.label))
      setConfirmOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed')
    } finally {
      setBusy(false)
    }
  }

  function onClick() {
    setError(null)
    if (hasMoments) {
      setConfirmOpen(true)
      return
    }
    void runGenerate()
  }

  return (
    <>
      <AiActionButton
        label="Generate moments"
        targetHint={hint}
        loading={busy}
        onClick={onClick}
      />
      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
      {confirmOpen ? (
        <ConfirmDialog
          open
          title={`Add moments to ${phase.name}?`}
          confirmLabel="Generate"
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void runGenerate()}
        >
          <p>
            AI will suggest additional moments for this phase and merge them with the existing
            list.
          </p>
          <p className="audion-ai-target-hint" title={hint}>
            Target <code>{hint}</code>
          </p>
        </ConfirmDialog>
      ) : null}
    </>
  )
}
