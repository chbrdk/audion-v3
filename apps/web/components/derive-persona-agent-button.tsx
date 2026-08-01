'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  DerivePersonaAgentProfileResponse,
  PersonaAgentDeriveFacet,
} from '@audion-v3/contracts'
import { ConfirmDialog } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflow-targets'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

const FACET_COPY: Record<
  PersonaAgentDeriveFacet,
  { title: string; body: string; label: string }
> = {
  researchProfile: {
    label: 'Derive',
    title: 'Derive research profile?',
    body: 'AI will set tech literacy, emotional baseline, stress triggers, and motivations from traits, goals, values, and frustrations.',
  },
  journeyBehavior: {
    label: 'Derive',
    title: 'Derive journey behaviour?',
    body: 'AI will set dimension sliders, dos, donts, and heuristics from traits, goals, values, and frustrations.',
  },
}

/**
 * Confirm-then-apply derive for research profile / journey behaviour agent knobs.
 */
export function DerivePersonaAgentButton({
  personaId,
  personaName,
  facet,
  disabled = false,
}: {
  personaId: string
  personaName?: string
  facet: PersonaAgentDeriveFacet
  disabled?: boolean
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hint = targetHint('derivePersonaAgentProfile')
  const copy = FACET_COPY[facet]

  async function runDerive() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiDerivePersonaAgentProfile(personaId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facets: [facet], output_locale: 'en' }),
      })
      const data = (await response.json().catch(() => null)) as
        | (DerivePersonaAgentProfileResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Derive failed (${response.status})`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Derive failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AiActionButton
        label={copy.label}
        targetHint={hint}
        loading={busy}
        disabled={disabled}
        onClick={() => {
          setError(null)
          setConfirmOpen(true)
        }}
      />
      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
      {confirmOpen ? (
        <ConfirmDialog
          open
          title={copy.title}
          confirmLabel="Derive"
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void runDerive()}
        >
          <p>
            {personaName ? (
              <>
                For <strong>{personaName}</strong>.{' '}
              </>
            ) : null}
            {copy.body}
          </p>
          <p className="audion-ai-target-hint" title={hint}>
            Target <code>{hint}</code>
          </p>
        </ConfirmDialog>
      ) : null}
    </>
  )
}
