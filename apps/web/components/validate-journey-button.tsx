'use client'

import React, { useState } from 'react'
import type {
  JourneyDetail,
  JourneyValidationMode,
  JourneyValidationReportList,
  JourneyValidationReportSummary,
  TargetGroupDetail,
  ValidateJourneyResponse,
} from '@audion-v3/contracts'
import { Button } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { targetHint } from '../lib/ai-workflows'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

type PersonaOption = { id: string; name: string; role?: string | null }

const MODE_OPTIONS: Array<{ value: JourneyValidationMode; label: string }> = [
  { value: 'automated', label: 'Automated (rule-based)' },
  { value: 'chat', label: 'Chat mode (persona voice)' },
  { value: 'both', label: 'Both' },
]

function formatReportLabel(item: JourneyValidationReportSummary): string {
  const when = new Date(item.validatedAt).toLocaleString()
  return `${when} · ${item.mode} · fit ${item.overallFitScore}`
}

/**
 * Journey topbar — validate against a TG-linked persona; history + chat mode.
 */
export function ValidateJourneyButton({ journey }: { journey: JourneyDetail }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadingPersonas, setLoadingPersonas] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ValidateJourneyResponse | null>(null)
  const [history, setHistory] = useState<JourneyValidationReportSummary[]>([])
  const [historyId, setHistoryId] = useState('')
  const [personas, setPersonas] = useState<PersonaOption[]>([])
  const [personaId, setPersonaId] = useState('')
  const [mode, setMode] = useState<JourneyValidationMode>('automated')
  const hint = targetHint('validateJourney')

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const response = await fetch(paths.routes.apiAiJourneyValidationReports(journey.id))
      const data = (await response.json().catch(() => null)) as
        | (JourneyValidationReportList & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Load history failed (${response.status})`)
      setHistory(data?.items ?? [])
    } catch (e) {
      setHistory([])
      setError(e instanceof Error ? e.message : 'Could not load report history')
    } finally {
      setLoadingHistory(false)
    }
  }

  async function openDialog() {
    setError(null)
    setReport(null)
    setHistoryId('')
    setMode('automated')
    setOpen(true)
    void loadHistory()
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

  async function openHistoryReport(reportId: string) {
    if (!reportId) {
      setHistoryId('')
      return
    }
    setHistoryId(reportId)
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiAiJourneyValidationReport(journey.id, reportId))
      const data = (await response.json().catch(() => null)) as
        | (ValidateJourneyResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Load report failed (${response.status})`)
      setReport(data)
      if (data?.personaId) setPersonaId(data.personaId)
      if (data?.mode) setMode(data.mode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open report')
    } finally {
      setBusy(false)
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
        body: JSON.stringify({ persona_ids: [personaId], mode }),
      })
      const data = (await response.json().catch(() => null)) as
        | (ValidateJourneyResponse & { error?: string })
        | null
      if (!response.ok) throw new Error(data?.error || `Validate failed (${response.status})`)
      setReport(data)
      setHistoryId(data?.reportId ?? '')
      await loadHistory()
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
            Fit this map against a persona — automated rules, chat-mode persona voice, or both.
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

          <label className="audion-editable-visuals-field">
            <span>Mode</span>
            <Select
              aria-label="Validation mode"
              value={mode}
              onChange={(value) => setMode(value as JourneyValidationMode)}
              disabled={busy}
              options={MODE_OPTIONS}
            />
          </label>

          {loadingHistory ? (
            <p className="audion-edit-lede">Loading report history…</p>
          ) : history.length ? (
            <label className="audion-editable-visuals-field">
              <span>Report history</span>
              <Select
                aria-label="Previous validation report"
                value={historyId}
                onChange={(value) => void openHistoryReport(value)}
                disabled={busy}
                options={[
                  { value: '', label: 'Select a previous report…' },
                  ...history.map((item) => ({
                    value: item.id,
                    label: formatReportLabel(item),
                  })),
                ]}
              />
            </label>
          ) : (
            <p className="audion-edit-lede">No saved reports yet — run validation to start history.</p>
          )}

          {error ? <p className="audion-project-knowledge-error">{error}</p> : null}

          {report ? (
            <div className="audion-journey-validation-report" aria-live="polite">
              <p className="audion-edit-lede">
                Overall fit <strong>{report.overallFitScore}</strong>
                {` · ${report.mode}`}
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
                            {fp.personaQuote ? (
                              <blockquote className="audion-journey-validation-quote">
                                {fp.personaQuote}
                              </blockquote>
                            ) : null}
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
