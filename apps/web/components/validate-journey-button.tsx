'use client'

import React, { useState } from 'react'
import type {
  JourneyDetail,
  TargetGroupDetail,
  ValidateJourneyResponse,
} from '@audion-v3/contracts'
import { Button } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflows'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

type PersonaOption = { id: string; name: string; role?: string | null }

/**
 * Journey topbar — validate against a TG-linked persona (rule-based V2 scorer).
 */
export function ValidateJourneyButton({ journey }: { journey: JourneyDetail }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadingPersonas, setLoadingPersonas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ValidateJourneyResponse | null>(null)
  const [personas, setPersonas] = useState<PersonaOption[]>([])
  const [personaId, setPersonaId] = useState('')
  const hint = targetHint('validateJourney')

  async function openDialog() {
    setError(null)
    setReport(null)
    setOpen(true)
    if (!journey.targetGroupId) {
      setPersonas([])
      setPersonaId('')
      return
    }
    setLoadingPersonas(true)
    try {
      const response = await fetch(paths.routes.apiTargetGroupDetail(journey.targetGroupId))
      const data = (await response.json().catch(() => null)) as
        | (TargetGroupDetail & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Load personas failed (${response.status})`)
      const list = (data?.linkedPersonas ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      }))
      setPersonas(list)
      setPersonaId(list[0]?.id ?? '')
    } catch (e) {
      setPersonas([])
      setPersonaId('')
      setError(e instanceof Error ? e.message : 'Could not load personas')
    } finally {
      setLoadingPersonas(false)
    }
  }

  async function runValidate() {
    if (!personaId) {
      setError('Select a persona to validate against.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiValidateJourney(journey.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_ids: [personaId], mode: 'automated' }),
      })
      const data = (await response.json().catch(() => null)) as
        | (ValidateJourneyResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Validate failed (${response.status})`)
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validate failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AiActionButton
        label="Validate"
        targetHint={hint}
        loading={busy && open}
        onClick={() => void openDialog()}
      />
      {open ? (
        <Dialog
          open
          onClose={() => {
            if (!busy) setOpen(false)
          }}
          className="audion-edit-dialog"
          title="Validate journey"
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Close
              </Button>
              <Button
                type="button"
                size="md"
                onClick={() => void runValidate()}
                disabled={busy || loadingPersonas || !personaId}
              >
                {busy ? 'Validating…' : 'Run validation'}
              </Button>
            </>
          }
        >
          <p className="audion-edit-lede">
            Rule-based fit of this map against a persona (V2 JourneyValidationService).
          </p>
          <p className="audion-ai-target-hint" title={hint}>
            Target <code>{hint}</code>
          </p>

          {loadingPersonas ? (
            <p className="audion-edit-lede">Loading personas…</p>
          ) : personas.length ? (
            <label className="audion-editable-visuals-field">
              <span>Persona</span>
              <Select
                aria-label="Persona to validate against"
                value={personaId}
                onChange={setPersonaId}
                disabled={busy}
                options={personas.map((p) => ({
                  value: p.id,
                  label: p.role ? `${p.name} · ${p.role}` : p.name,
                }))}
              />
            </label>
          ) : (
            <p className="audion-edit-lede">
              Link a target group with personas to enable validation.
            </p>
          )}

          {error ? <p className="audion-project-knowledge-error">{error}</p> : null}

          {report ? (
            <div className="audion-journey-validation-report" aria-live="polite">
              <p className="audion-edit-lede">
                Overall fit <strong>{report.overallFitScore}</strong>
                {report.stubbed ? ' · stub' : ' · live'}
              </p>
              <ul className="audion-journey-validation-phases">
                {report.phases.map((phase) => (
                  <li key={phase.phaseId} data-status={phase.status}>
                    <div className="audion-journey-validation-phase-head">
                      <span>{phase.phaseName}</span>
                      <span>
                        {phase.fitScore} · {phase.status}
                      </span>
                    </div>
                    {phase.frictionPoints.length ? (
                      <ul>
                        {phase.frictionPoints.map((fp, i) => (
                          <li key={`${phase.phaseId}-fp-${i}`}>
                            [{fp.severity}] {fp.description}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {phase.recommendations.length ? (
                      <ul>
                        {phase.recommendations.map((rec, i) => (
                          <li key={`${phase.phaseId}-rec-${i}`}>{rec}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Dialog>
      ) : null}
    </>
  )
}
