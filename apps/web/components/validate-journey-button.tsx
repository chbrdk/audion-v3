'use client'

import React, { useMemo, useState } from 'react'
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
import { targetHint } from '../lib/ai-workflow-targets'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { AiActionButton } from './ai-action-button'

type PersonaOption = { id: string; name: string; role?: string | null }

/**
 * Journey topbar — validate against a TG-linked persona; history + chat mode.
 */
export function ValidateJourneyButton({ journey }: { journey: JourneyDetail }) {
  const t = useT()
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

  const modeOptions = useMemo(
    () => [
      { value: 'automated' as const, label: t('dialogs.validateModeAutomated') },
      { value: 'chat' as const, label: t('dialogs.validateModeChat') },
      { value: 'both' as const, label: t('dialogs.validateModeBoth') },
    ],
    [t],
  )

  const modeLabel = (value: JourneyValidationMode) =>
    modeOptions.find((option) => option.value === value)?.label ?? value

  function formatReportLabel(item: JourneyValidationReportSummary): string {
    const when = new Date(item.validatedAt).toLocaleString()
    return t('dialogs.validateReportLabel', {
      when,
      mode: modeLabel(item.mode),
      score: String(item.overallFitScore),
    })
  }

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const response = await fetch(paths.routes.apiAiJourneyValidationReports(journey.id))
      const data = (await response.json().catch(() => null)) as
        | (JourneyValidationReportList & { error?: string })
        | null
      if (!response.ok) {
        throw new Error(data?.error || `${t('dialogs.validateHistoryFailed')} (${response.status})`)
      }
      setHistory(data?.items ?? [])
    } catch (e) {
      setHistory([])
      setError(e instanceof Error ? e.message : t('dialogs.validateHistoryFailed'))
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
      if (!response.ok) {
        throw new Error(data?.error || `${t('dialogs.validatePersonasFailed')} (${response.status})`)
      }
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
      setError(e instanceof Error ? e.message : t('dialogs.validatePersonasFailed'))
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
      if (!response.ok) {
        throw new Error(data?.error || `${t('dialogs.validateReportFailed')} (${response.status})`)
      }
      setReport(data)
      if (data?.personaId) setPersonaId(data.personaId)
      if (data?.mode) setMode(data.mode)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dialogs.validateReportFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function runValidate() {
    if (!personaId) {
      setError(t('dialogs.validateSelectPersona'))
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
      if (!response.ok) {
        throw new Error(data?.error || `${t('dialogs.validateFailed')} (${response.status})`)
      }
      setReport(data)
      setHistoryId(data?.reportId ?? '')
      await loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dialogs.validateFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AiActionButton
        label={t('dialogs.validateJourney')}
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
          title={t('dialogs.validateJourneyTitle')}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                {t('common.close')}
              </Button>
              <Button
                type="button"
                size="md"
                onClick={() => void runValidate()}
                disabled={busy || loadingPersonas || !personaId}
              >
                {busy ? t('dialogs.validateRunning') : t('dialogs.validateRun')}
              </Button>
            </>
          }
        >
          <p className="audion-edit-lede">{t('dialogs.validateJourneyLede')}</p>
          <p className="audion-ai-target-hint" title={hint}>
            Target <code>{hint}</code>
          </p>

          {loadingPersonas ? (
            <p className="audion-edit-lede">{t('dialogs.validateLoadingPersonas')}</p>
          ) : personas.length ? (
            <label className="audion-editable-visuals-field">
              <span>{t('dialogs.fieldPersona')}</span>
              <Select
                aria-label={t('dialogs.validatePersonaAria')}
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
            <p className="audion-edit-lede">{t('dialogs.validateNeedTg')}</p>
          )}

          <label className="audion-editable-visuals-field">
            <span>{t('dialogs.validateMode')}</span>
            <Select
              aria-label={t('dialogs.validateModeAria')}
              value={mode}
              onChange={(value) => setMode(value as JourneyValidationMode)}
              disabled={busy}
              options={modeOptions}
            />
          </label>

          {loadingHistory ? (
            <p className="audion-edit-lede">{t('dialogs.validateLoadingHistory')}</p>
          ) : history.length ? (
            <label className="audion-editable-visuals-field">
              <span>{t('dialogs.validateHistory')}</span>
              <Select
                aria-label={t('dialogs.validateHistoryAria')}
                value={historyId}
                onChange={(value) => void openHistoryReport(value)}
                disabled={busy}
                options={[
                  { value: '', label: t('dialogs.validateHistorySelect') },
                  ...history.map((item) => ({
                    value: item.id,
                    label: formatReportLabel(item),
                  })),
                ]}
              />
            </label>
          ) : (
            <p className="audion-edit-lede">{t('dialogs.validateHistoryEmpty')}</p>
          )}

          {error ? <p className="audion-project-knowledge-error">{error}</p> : null}

          {report ? (
            <div className="audion-journey-validation-report" aria-live="polite">
              <p className="audion-edit-lede">
                {t('dialogs.validateOverallFit')} <strong>{report.overallFitScore}</strong>
                {` · ${modeLabel(report.mode)}`}
                {report.stubbed
                  ? ` · ${t('dialogs.validateStub')}`
                  : ` · ${t('dialogs.validateLive')}`}
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
