'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  SoftScoreEntry,
  UxHypothesisVerdict,
  UxStudyDetail,
  UxWaveCompareDelta,
  UxWaveDetail,
  UxWaveRunItem,
} from '@audion-v3/contracts'
import {
  Accordion,
  Button,
  EmptyState,
  Field,
  Hint,
  Input,
  Panel,
  RankedList,
  RankedRow,
  SectionChrome,
  Lede,
  LedeStrip,
  StatusDot,
  StatusMeterPanel,
  Text,
  Textarea,
} from '@msqdx/ui'
import { ConfirmDialog, Dialog, Select } from '../lib/msqdx-ui-client'
import { buildWaveReportMarkdown } from '../lib/ux-wave-report'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import {
  confidenceToPercent,
  formatSoftScoreValue,
  parseConfidencePercentInput,
  parseSoftScoreValueInput,
  softScoreScaleOptions,
} from '../lib/soft-score-display'
import {
  buildChatPrefillDraft,
  pickWaveChatPersonaId,
} from '../lib/chat/prefill'
import { CategoryScoreChart } from './category-score-chart'
import { KnowledgeRichEditor } from './knowledge-rich-editor'
import { ScanInCheckionCta } from './scan-in-checkion-cta'

const VERDICT_OPTIONS = [
  { value: 'supported', label: 'Supported' },
  { value: 'partially_supported', label: 'Partially supported' },
  { value: 'inconclusive', label: 'Inconclusive' },
  { value: 'refuted', label: 'Refuted' },
  { value: 'not_tested', label: 'Not tested' },
]

const SYNC_POLL_MS = 4000

function splitPersonaName(name: string): { lead: string; rest: string | null } {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return { lead: name.trim() || 'Unassigned persona', rest: null }
  return { lead: parts[0], rest: parts.slice(1).join(' ') }
}

function FacetTile({
  label,
  value,
  kind,
}: {
  label: string
  value: React.ReactNode
  kind: string
}) {
  return (
    <li data-kind={kind}>
      <span className="meta">{label}</span>
      {value}
    </li>
  )
}

function evidenceLabel(valid: boolean | null | undefined): string {
  if (valid === true) return 'valid'
  if (valid === false) return 'invalid'
  return 'pending'
}

function agentDotLevel(status: string | null | undefined): 'ok' | 'warn' | 'critical' {
  if (status === 'complete') return 'ok'
  if (status === 'running') return 'warn'
  return 'critical'
}

function SoftQBoard({
  wave,
  onPatchSoft,
}: {
  wave: UxWaveDetail
  onPatchSoft: (key: string, entry: SoftScoreEntry) => Promise<void>
}) {
  const t = useT()
  const soft = wave.evaluation?.softScores
  if (!soft) {
    return (
      <Panel
        className="detail-block audion-magazine-band audion-study-section"
        aria-label={t('wave.softQBoard')}
      >
        <SectionChrome quiet role="signals" title={t('wave.softQBoard')} as="h3" />
        <EmptyState>{t('wave.softQEmpty')}</EmptyState>
      </Panel>
    )
  }
  const entries = Object.entries(soft).filter(([k, v]) => k !== 'basis' && v && typeof v === 'object')
  return (
    <Panel
      className="detail-block audion-magazine-band audion-study-section"
      aria-label={t('wave.softQBoard')}
    >
      <SectionChrome
        quiet
        role="signals"
        title={t('wave.softQBoard')}
        meta={`${entries.length} scores`}
        metaTone="accent"
        as="h3"
      />
      <Hint panel>
        validEvidence-only · not Testbirds sample means
        {typeof soft.basis === 'string' ? ` · ${soft.basis}` : ''}
      </Hint>
      <ul className="audion-study-prompt-grid" aria-label="Soft scores Q1–Q7">
        {entries.map(([key, raw], index) => {
          const e = raw as SoftScoreEntry
          const qId = key.split('_')[0] || `Q${index + 1}`
          const title = key.replace(/^Q\d+_/, '').replace(/_/g, ' ')
          const score = formatSoftScoreValue(e.value)
          return (
            <li key={key}>
              <article
                className="audion-journey-slide audion-study-prompt-slide"
                aria-label={`${qId}: ${title}`}
              >
                <Panel as="div" className="audion-journey-slide-panel">
                  <header className="audion-journey-slide-head">
                    <div className="audion-journey-slide-head-copy">
                      <span className="audion-journey-slide-num" aria-hidden>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Text role="label" className="audion-journey-slide-eyebrow">
                        Soft-Q · {qId}
                      </Text>
                      <Text
                        role="headline"
                        as="h4"
                        className="audion-journey-slide-title"
                        lang="de"
                      >
                        {title}
                      </Text>
                    </div>
                  </header>
                  <div className="audion-journey-slide-section">
                    <Text role="label" className="audion-journey-slide-section-label">
                      Reading
                    </Text>
                    <p className="audion-journey-slide-summary">
                      {e.rationale || 'No rationale yet.'}
                    </p>
                  </div>
                  <div className="audion-journey-slide-section">
                    <LedeStrip
                      columns={2}
                      className="audion-soft-q-lede-stats"
                      aria-label={`${qId} score`}
                    >
                      <Lede
                        value={score.text}
                        label={
                          score.kind === 'text'
                            ? `Choice${e.scale ? ` · ${e.scale.replace(/_/g, ' ')}` : ''}`
                            : `${t('wave.score')}${e.scale ? ` · ${e.scale.replace(/_/g, ' ')}` : ''}`
                        }
                        kind={score.kind === 'text' ? 'text' : score.kind === 'empty' ? 'empty' : 'number'}
                        tone={
                          score.kind === 'number' && score.numeric >= 3
                            ? 'pos'
                            : score.kind === 'text'
                              ? 'choice'
                              : 'low'
                        }
                      />
                      <Lede
                        value={(e.confidence * 100).toFixed(0)}
                        unit="%"
                        label={t('wave.confidence')}
                        tone={e.confidence >= 0.5 ? 'pos' : 'low'}
                      />
                    </LedeStrip>
                  </div>
                  <div className="audion-journey-slide-section audion-soft-q-edit-row">
                    <Field label={t('wave.value')} size="sm" htmlFor={`soft-value-${key}`}>
                      {(() => {
                        const scaleOpts = softScoreScaleOptions(e.scale)
                        if (scaleOpts.kind === 'numeric') {
                          return (
                            <Select
                              id={`soft-value-${key}`}
                              options={scaleOpts.options}
                              value={e.value == null ? '' : String(e.value)}
                              onChange={(value) => {
                                const next = parseSoftScoreValueInput(value, e.scale)
                                if (next === e.value || (next == null && e.value == null)) return
                                void onPatchSoft(key, { ...e, value: next })
                              }}
                            />
                          )
                        }
                        return (
                          <Input
                            id={`soft-value-${key}`}
                            block
                            key={`val-${key}-${String(e.value)}`}
                            defaultValue={e.value == null ? '' : String(e.value)}
                            placeholder="choice or score"
                            onBlur={(ev) => {
                              const next = parseSoftScoreValueInput(ev.target.value, e.scale)
                              if (next === e.value || (next == null && e.value == null)) return
                              void onPatchSoft(key, { ...e, value: next })
                            }}
                          />
                        )
                      })()}
                    </Field>
                    <Field label={t('wave.confidencePct')} size="sm" htmlFor={`soft-conf-${key}`}>
                      <Input
                        id={`soft-conf-${key}`}
                        block
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        key={`conf-${key}-${e.confidence}`}
                        defaultValue={confidenceToPercent(e.confidence)}
                        onBlur={(ev) => {
                          const next = parseConfidencePercentInput(ev.target.value)
                          if (next == null || Math.abs(next - e.confidence) < 0.0001) return
                          void onPatchSoft(key, { ...e, confidence: next })
                        }}
                      />
                    </Field>
                  </div>
                  <div className="audion-journey-slide-section">
                    <Field label={t('wave.rationale')} size="sm" htmlFor={`soft-${key}`}>
                      <Textarea
                        id={`soft-${key}`}
                        block
                        rows={2}
                        key={`rat-${key}-${e.rationale}`}
                        defaultValue={e.rationale}
                        onBlur={(ev) => {
                          const next = ev.target.value
                          if (next === e.rationale) return
                          void onPatchSoft(key, { ...e, rationale: next })
                        }}
                      />
                    </Field>
                  </div>
                </Panel>
              </article>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function parseScreenerPrompt(prompt: string): { code: string; text: string } {
  const match = prompt.match(/^(F[\d.]+)\s+(.+)$/i)
  if (!match) return { code: 'F', text: prompt }
  return { code: match[1]!, text: match[2]! }
}

function ScreenerPrompts({
  study,
  wave,
}: {
  study: UxStudyDetail
  wave: UxWaveDetail
}) {
  const t = useT()
  const prompts = [
    'F2.1 Was ist der Zweck dieser Seite?',
    'F2.2 Was fällt dir als Erstes auf?',
    'F5.1 Würdest du das Tool weiterempfehlen — warum?',
    'F5.2 Was fehlte für eine sichere Entscheidung?',
  ]
  const personaId = pickWaveChatPersonaId(wave.runs)

  function chatContext(prompt: string) {
    return {
      prompt,
      personaId,
      studyId: study.id,
      waveId: wave.id,
      projectId: study.projectId,
      studyName: study.name,
      waveKey: wave.waveKey,
    }
  }

  async function copyPrompt(prompt: string) {
    try {
      await navigator.clipboard.writeText(buildChatPrefillDraft(chatContext(prompt)))
    } catch {
      /* ignore */
    }
  }

  return (
    <Panel
      className="detail-block audion-magazine-band audion-study-section"
      aria-label={t('wave.screener')}
    >
      <SectionChrome
        quiet
        role="research"
        title={t('wave.screener')}
        meta={personaId ? 'persona' : 'Chat'}
        as="h3"
      />
      <Hint panel>
        After runs, hang these on persona chat for «{study.name}»
        {personaId ? ` · ${personaId}` : ''}. Merge answers into the wave evaluation.
      </Hint>
      <ul className="audion-study-prompt-grid" aria-label="Screener F-questions">
        {prompts.map((p, i) => {
          const { code, text } = parseScreenerPrompt(p)
          return (
            <li key={p}>
              <article
                className="audion-journey-slide audion-study-prompt-slide"
                aria-label={`${code}: ${text}`}
              >
                <Panel as="div" className="audion-journey-slide-panel">
                  <header className="audion-journey-slide-head">
                    <div className="audion-journey-slide-head-copy">
                      <span className="audion-journey-slide-num" aria-hidden>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <Text role="label" className="audion-journey-slide-eyebrow">
                        F-Frage
                      </Text>
                      <Text role="headline" as="h4" className="audion-journey-slide-title">
                        {code}
                      </Text>
                    </div>
                  </header>
                  <div className="audion-journey-slide-section">
                    <Text role="label" className="audion-journey-slide-section-label">
                      Prompt
                    </Text>
                    <p className="audion-journey-slide-summary">{text}</p>
                  </div>
                  <div className="audion-journey-slide-section audion-study-prompt-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyPrompt(p)}
                    >
                      Copy
                    </Button>
                    <Link
                      href={paths.routes.chatWithContext(chatContext(p))}
                      className="audion-link"
                    >
                      {t('wave.openChat')}
                    </Link>
                  </div>
                </Panel>
              </article>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function WaveReportBand({
  study,
  wave,
  onSaved,
}: {
  study: UxStudyDetail
  wave: UxWaveDetail
  onSaved: (next: UxWaveDetail) => void
}) {
  const t = useT()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(wave.reportMarkdown ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) return
    setDraft(wave.reportMarkdown ?? '')
  }, [wave.reportMarkdown, wave.id, editing])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiStudyWaveDetail(study.id, wave.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveKey: wave.waveKey, reportMarkdown: draft }),
      })
      if (!res.ok) throw new Error('Save failed')
      const next = (await res.json()) as UxWaveDetail
      onSaved(next)
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel
      className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
      aria-label={t('wave.report')}
    >
      <SectionChrome
        quiet
        role="ops"
        title={t('wave.report')}
        meta={wave.reportUpdatedAt ? 'edited' : 'draft'}
        metaTone="accent"
        as="h3"
        action={
          editing ? (
            <div className="audion-magazine-topbar-actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setDraft(wave.reportMarkdown ?? '')
                  setEditing(false)
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="subtle" size="sm" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          )
        }
      />
      <Hint panel>Narrative report draft — included in Export with evaluation aggregates.</Hint>
      {editing ? (
        <KnowledgeRichEditor
          content={draft || '<p></p>'}
          editable
          ariaLabel="Wave report editor"
          placeholder="Write the wave narrative…"
          onChange={setDraft}
        />
      ) : wave.reportMarkdown?.trim() ? (
        <div
          className="audion-knowledge-body"
          dangerouslySetInnerHTML={{ __html: wave.reportMarkdown }}
        />
      ) : (
        <EmptyState>{t('wave.reportEmpty')}</EmptyState>
      )}
      {error ? (
        <p className="audion-edit-error" role="alert">
          {error}
        </p>
      ) : null}
    </Panel>
  )
}

function RunPanel({
  run,
  studyId,
  waveId,
  audionProjectId,
  onPatchFinding,
  onConverted,
}: {
  run: UxWaveRunItem
  studyId: string
  waveId: string
  audionProjectId?: string | null
  onPatchFinding: (runKey: string, finding: string) => Promise<void>
  onConverted: (journeyId: string) => void
}) {
  const t = useT()
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const evidence = evidenceLabel(run.validEvidence)
  const categoryEntries = Object.entries(run.categories || {}).filter(
    ([, v]) => typeof v === 'number',
  ) as Array<[string, number]>
  const persona = splitPersonaName(run.personaName || 'Unassigned persona')

  async function onConvert() {
    setConverting(true)
    setConvertError(null)
    try {
      const res = await fetch(paths.routes.apiJourneyFromUxRun, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId,
          waveId,
          runKey: run.runKey,
          jobId: run.jobId,
          personaId: run.personaId,
          mode: 'deterministic',
          journeyType: 'ux_audit',
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
        journey?: { id: string }
      } | null
      if (!res.ok || !data?.journey?.id) {
        throw new Error(data?.error || `Convert failed (${res.status})`)
      }
      onConverted(data.journey.id)
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : 'Convert failed')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="audion-wave-run-panel">
      <header className="audion-wave-run-head">
        <div className="audion-wave-run-identity">
          <Text role="label" className="audion-wave-run-kicker">
            Persona
          </Text>
          <Text role="headline" as="h4" className="audion-wave-run-persona">
            <span className="audion-wave-run-persona-lead">{persona.lead}</span>
            {persona.rest ? (
              <span className="audion-wave-run-persona-rest">{persona.rest}</span>
            ) : null}
          </Text>
          {run.segment ? (
            <Text role="meta" className="audion-wave-run-segment">
              {run.segment.replace(/_/g, ' ')}
            </Text>
          ) : null}
        </div>
        <span className="audion-wave-run-evidence" data-evidence={String(run.validEvidence)}>
          <StatusDot level={agentDotLevel(run.agentStatus)} /> {evidence}
          {run.agentStatus ? ` · ${run.agentStatus}` : ''}
        </span>
      </header>

      <ul className="audion-wave-run-stats" aria-label="Run metrics">
        <li>
          <span className="audion-wave-run-stat-label">{t('wave.friction')}</span>
          <strong className="audion-wave-run-stat-value ds-text-numeric">
            {run.frictionScore ?? '—'}
          </strong>
        </li>
        <li>
          <span className="audion-wave-run-stat-label">{t('wave.personaFit')}</span>
          <strong className="audion-wave-run-stat-value ds-text-numeric">
            {run.personaFitScore ?? '—'}
          </strong>
        </li>
        <li>
          <span className="audion-wave-run-stat-label">{t('wave.steps')}</span>
          <strong className="audion-wave-run-stat-value ds-text-numeric">
            {run.steps ?? '—'}
          </strong>
        </li>
        <li>
          <span className="audion-wave-run-stat-label">{t('wave.goal')}</span>
          <strong className="audion-wave-run-stat-value">
            {run.goalReached === true ? 'reached' : run.goalReached === false ? 'missed' : '—'}
          </strong>
        </li>
        <li>
          <span className="audion-wave-run-stat-label">{t('wave.task')}</span>
          <strong className="audion-wave-run-stat-value">
            {run.taskCompleted === true
              ? 'done'
              : run.taskCompleted === false
                ? 'open'
                : '—'}
          </strong>
        </li>
      </ul>

      <blockquote className="audion-wave-run-finding">
        <Text role="label" className="audion-wave-run-kicker">
          Finding
        </Text>
        <Field label="" size="sm" htmlFor={`finding-${run.id}`}>
          <Textarea
            id={`finding-${run.id}`}
            block
            rows={2}
            defaultValue={run.finding ?? ''}
            placeholder="Finding…"
            onBlur={(ev) => {
              const next = ev.target.value
              if (next === (run.finding ?? '')) return
              void onPatchFinding(run.runKey, next)
            }}
          />
        </Field>
      </blockquote>

      {run.blockers.length ? (
        <div className="audion-wave-run-blockers-block">
          <Text role="label" className="audion-wave-run-kicker">
            Blockers
          </Text>
          <ul className="audion-wave-run-chips" aria-label="Blockers">
            {run.blockers.map((b) => (
              <li key={b}>
                <span className="audion-wave-run-chip">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run.validEvidenceCaveat ? (
        <Hint panel className="audion-wave-run-caveat">
          {run.validEvidenceCaveat}
        </Hint>
      ) : null}

      {categoryEntries.length ? (
        <div className="audion-wave-run-categories">
          <Text role="label" className="audion-wave-run-kicker">
            Scorecard
          </Text>
          <CategoryScoreChart categories={run.categories} />
        </div>
      ) : null}

      {run.url ? (
        <p className="audion-edit-lede">
          <Text role="label" className="audion-wave-run-kicker">
            Run URL
          </Text>{' '}
          <code title={run.url}>{run.url}</code>
        </p>
      ) : null}

      <div className="audion-wave-run-convert">
        <ScanInCheckionCta
          url={run.url}
          audionProjectId={audionProjectId}
          audionRunId={run.id}
        />
        {run.derivedJourneyId ? (
          <Link
            href={paths.routes.journeyDetail(run.derivedJourneyId)}
            className="audion-wave-run-convert-link"
          >
            {t('chatExtra.openJourney')}
          </Link>
        ) : (
          <Button
            type="button"
            variant="subtle"
            size="sm"
            disabled={converting}
            onClick={() => void onConvert()}
          >
            {converting ? t('wave.converting') : t('wave.convertJourney')}
          </Button>
        )}
        {convertError ? (
          <p className="audion-edit-error" role="alert">
            {convertError}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function WaveDetailPanel({
  study,
  wave,
  selfCompare,
}: {
  study: UxStudyDetail
  wave: UxWaveDetail
  selfCompare: UxWaveCompareDelta | null
}) {
  const t = useT()
  const router = useRouter()
  const [liveWave, setLiveWave] = useState(wave)
  const [compare, setCompare] = useState(selfCompare)
  const [exportMd, setExportMd] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [startHint, setStartHint] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareOtherId, setCompareOtherId] = useState(
    () => study.waves.find((w) => w.id !== wave.id)?.id ?? wave.id,
  )
  const [openRun, setOpenRun] = useState<string | null>(wave.runs[0]?.id ?? null)
  const [openHyp, setOpenHyp] = useState<string | null>(
    wave.evaluation?.hypotheses[0]?.id ?? null,
  )

  useEffect(() => {
    setLiveWave(wave)
  }, [wave])

  useEffect(() => {
    if (liveWave.status !== 'running') return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await fetch(paths.routes.apiStudyWaveSync(study.id, liveWave.id), {
          method: 'POST',
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { wave?: UxWaveDetail }
        if (data.wave && !cancelled) {
          setLiveWave(data.wave)
          if (data.wave.status !== 'running') router.refresh()
        }
      } catch {
        /* poll continues */
      }
    }
    const id = window.setInterval(() => void tick(), SYNC_POLL_MS)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [liveWave.status, liveWave.id, study.id, router])

  const segments = useMemo(() => {
    const map = new Map<string, typeof liveWave.runs>()
    for (const r of liveWave.runs) {
      const key = r.segment || 'unsegmented'
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [liveWave.runs])

  const agg = liveWave.evaluation?.aggregate
  const otherWaves = study.waves.filter((w) => w.id !== liveWave.id)
  const runningCount = liveWave.runs.filter((r) => r.agentStatus === 'running').length
  const completeCount = liveWave.runs.filter((r) => r.agentStatus === 'complete').length

  async function patchWave(body: Record<string, unknown>) {
    const res = await fetch(paths.routes.apiStudyWaveDetail(study.id, liveWave.id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waveKey: liveWave.waveKey, ...body }),
    })
    if (!res.ok) throw new Error('Patch failed')
    const next = (await res.json()) as UxWaveDetail
    setLiveWave(next)
    router.refresh()
    return next
  }

  async function onEvaluate() {
    setBusy(true)
    try {
      const res = await fetch(paths.routes.apiStudyWaveEvaluate(study.id, liveWave.id), {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Evaluate failed')
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function onStartConfirm() {
    setStartOpen(false)
    setBusy(true)
    setStartHint(null)
    try {
      const needsRestart =
        liveWave.status === 'complete' ||
        liveWave.runs.every((r) => r.agentStatus === 'complete') ||
        ((liveWave.validEvidenceCount ?? 0) === 0 &&
          liveWave.runs.some((r) => r.agentStatus === 'complete'))
      const force = needsRestart
      const res = await fetch(paths.routes.apiStudyWaveStart(study.id, liveWave.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) throw new Error('Start failed')
      const data = (await res.json()) as {
        wave?: UxWaveDetail
        started?: Array<{ runKey: string; skipped?: boolean }>
      }
      if (data.wave) setLiveWave(data.wave)
      else router.refresh()
      const started = data.started ?? []
      const skipped = started.filter((s) => s.skipped).length
      if (started.length > 0 && skipped === started.length) {
        setStartHint(
          'Alle Runs waren bereits complete — nichts neu gestartet. Nochmal mit Restart versuchen.',
        )
      } else if (force) {
        setStartHint('Wave neu gestartet — Agent-Jobs laufen.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onComparePick() {
    setBusy(true)
    try {
      const otherId = compareOtherId || liveWave.id
      const res = await fetch(
        paths.routes.apiStudyWaveCompare(study.id, liveWave.id, otherId),
      )
      if (!res.ok) throw new Error('Compare failed')
      setCompare((await res.json()) as UxWaveCompareDelta)
      setCompareOpen(false)
    } finally {
      setBusy(false)
    }
  }

  function onExport() {
    const md = buildWaveReportMarkdown(liveWave, study.name)
    setExportMd(md)
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${liveWave.waveKey}-report.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <article className="panel briefing-detail audion-magazine audion-magazine--wave">
      <div className="audion-magazine-topbar ds-motion-reveal">
        <p className="briefing-nav signal-nav">
          <Link href={paths.routes.studies}>UX Studies</Link>
          <span className="briefing-nav-sep" aria-hidden>
            ·
          </span>
          <Link href={paths.routes.studyDetail(study.id)}>{study.name}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            ·
          </span>
          <span data-status={liveWave.status} className="audion-magazine-status">
            <StatusDot
              level={
                liveWave.status === 'complete'
                  ? 'ok'
                  : liveWave.status === 'running'
                    ? 'warn'
                    : 'critical'
              }
            />{' '}
            {liveWave.status}
          </span>
        </p>
        <div className="audion-magazine-topbar-actions">
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={() => setStartOpen(true)}
            disabled={busy || liveWave.status === 'running'}
          >
            {liveWave.status === 'complete' ||
            liveWave.runs.every((r) => r.agentStatus === 'complete')
              ? t('wave.restartAgent')
              : t('wave.startAgent')}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onEvaluate} disabled={busy}>
            {t('wave.evaluate')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={() => setCompareOpen(true)}
            disabled={busy}
          >
            {t('wave.compare')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onExport} disabled={busy}>
            {t('wave.exportReport')}
          </Button>
        </div>
      </div>
      {startHint ? <Hint>{startHint}</Hint> : null}

      {liveWave.status === 'running' ? (
        <StatusMeterPanel
          className="ds-motion-reveal"
          title={t('wave.uxJourneyAgent')}
          meta="Studies Start/Sync · official agent surface"
          level="warn"
          banner={`${runningCount} running · ${completeCount}/${liveWave.runs.length} complete`}
          meters={liveWave.runs.slice(0, 3).map((r) => ({
            id: r.id,
            label: r.runKey,
            value: r.agentStatus ?? 'pending',
            fillPct:
              r.agentStatus === 'complete' ? 100 : r.agentStatus === 'running' ? 55 : 10,
            meta: evidenceLabel(r.validEvidence),
          }))}
        />
      ) : null}

      <header className="signal-hero briefing-hero audion-magazine-hero audion-magazine-hero--split ds-motion-reveal">
        <div className="audion-magazine-hero-copy">
          <Text role="label" className="briefing-eyebrow">
            Wave
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {liveWave.waveKey}
          </Text>
          <Text role="body" className="audion-magazine-deck">
            {study.name}
          </Text>
        </div>
        <ul className="geo-places audion-magazine-facets" aria-label="Wave attributes">
          <FacetTile label="Status" value={liveWave.status} kind={liveWave.status} />
          <FacetTile label="Runs" value={String(liveWave.runCount)} kind="runs" />
          <FacetTile
            label="Valid evidence"
            value={`${liveWave.validEvidenceCount}/${liveWave.runCount}`}
            kind="evidence"
          />
          {agg ? (
            <FacetTile
              label="Mean friction"
              value={agg.meanFrictionValidOnly ?? '—'}
              kind="friction"
            />
          ) : null}
        </ul>
      </header>

      {agg ? (
        <div
          className="audion-wave-lede audion-magazine-lede ds-motion-reveal"
          aria-label="Wave evaluation summary"
        >
          <LedeStrip columns={3} className="audion-wave-lede-stats" aria-label="Wave rates">
            <Lede
              value={(agg.taskCompletionRate * 100).toFixed(0)}
              unit="%"
              label="Task completion"
              tone={agg.taskCompletionRate >= 0.5 ? 'pos' : 'low'}
            />
            <Lede
              value={(agg.validEvidenceRate * 100).toFixed(0)}
              unit="%"
              label="Valid evidence"
              tone={agg.validEvidenceRate >= 0.5 ? 'pos' : 'low'}
            />
            <Lede
              value={(agg.infrastructureBlockRate * 100).toFixed(0)}
              unit="%"
              label="Infrastructure block"
              tone={agg.infrastructureBlockRate >= 0.5 ? 'neg' : 'ok'}
            />
          </LedeStrip>
        </div>
      ) : (
        <p className="audion-magazine-lede audion-wave-lede--empty ds-motion-reveal">
          Run the evaluate action to aggregate validEvidence scores and hypotheses.
        </p>
      )}

      <div className="audion-magazine-body audion-wave-body">
        <WaveReportBand
          study={study}
          wave={liveWave}
          onSaved={(next) => setLiveWave(next)}
        />

        <Panel
          className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
          aria-label={t('wave.runMatrix')}
        >
          <SectionChrome
            quiet
            role="pipeline"
            title={t('wave.runMatrix')}
            meta={`${segments.length} segment${segments.length === 1 ? '' : 's'}`}
            metaTone="accent"
            as="h3"
          />
          <Hint panel>
            Segment matrix (H5): same tasks across personas. Navigation run covers H3 / Q4.
          </Hint>
          {segments.map(([segment, runs]) => (
            <div key={segment} className="audion-wave-segment">
              <Text role="title" as="h4" className="audion-wave-segment-title">
                {segment}
              </Text>
              <Accordion
                aria-label={`Runs for ${segment}`}
                value={openRun && runs.some((r) => r.id === openRun) ? openRun : null}
                onChange={setOpenRun}
                items={runs.map((r) => ({
                  id: r.id,
                  title: (
                    <>
                      <span className="audion-study-hyp-id">{r.runKey}</span>
                      {r.leitfadenBlock ? ` · ${r.leitfadenBlock}` : ''}
                    </>
                  ),
                  preview: `${evidenceLabel(r.validEvidence)} · friction ${r.frictionScore ?? '—'}`,
                  panel: (
                    <RunPanel
                      run={r}
                      studyId={study.id}
                      waveId={liveWave.id}
                      audionProjectId={study.projectId}
                      onPatchFinding={async (runKey, finding) => {
                        await patchWave({
                          runs: [{ runKey, url: r.url, task: r.task, finding }],
                        })
                      }}
                      onConverted={(journeyId) => {
                        setLiveWave((prev) => ({
                          ...prev,
                          runs: prev.runs.map((run) =>
                            run.id === r.id ? { ...run, derivedJourneyId: journeyId } : run,
                          ),
                        }))
                        router.push(paths.routes.journeyDetail(journeyId))
                      }}
                    />
                  ),
                }))}
              />
            </div>
          ))}
        </Panel>

        {liveWave.evaluation?.hypotheses?.length ? (
          <Panel
            className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
            aria-label={t('wave.hypotheses')}
          >
            <SectionChrome
              quiet
              role="signals"
              title={t('wave.hypotheses')}
              meta={`${liveWave.evaluation.hypotheses.length}`}
              metaTone="accent"
              as="h3"
            />
            <Accordion
              aria-label="Hypothesis verdicts"
              value={openHyp}
              onChange={setOpenHyp}
              items={liveWave.evaluation.hypotheses.map((h) => ({
                id: h.id,
                title: (
                  <>
                    <span className="audion-study-hyp-id">{h.id}</span> · {h.verdict}
                  </>
                ),
                preview: h.statement,
                panel: (
                  <div className="audion-wave-run-panel audion-wave-hyp-panel">
                    <blockquote className="audion-wave-run-finding">
                      <Text role="label" className="audion-wave-run-kicker">
                        Statement
                      </Text>
                      <p>{h.statement}</p>
                    </blockquote>
                    <Field label="Verdict" size="sm" htmlFor={`hyp-verdict-${h.id}`}>
                      <Select
                        id={`hyp-verdict-${h.id}`}
                        options={VERDICT_OPTIONS}
                        value={h.verdict}
                        onChange={(value) => {
                          const nextHyps = liveWave.evaluation!.hypotheses.map((row) =>
                            row.id === h.id
                              ? { ...row, verdict: value as UxHypothesisVerdict }
                              : row,
                          )
                          void patchWave({ evaluation: { hypotheses: nextHyps } })
                        }}
                      />
                    </Field>
                    <Field label={t('wave.rationale')} size="sm" htmlFor={`hyp-rat-${h.id}`}>
                      <Textarea
                        id={`hyp-rat-${h.id}`}
                        block
                        rows={2}
                        defaultValue={h.rationale}
                        onBlur={(ev) => {
                          const next = ev.target.value
                          if (next === h.rationale) return
                          const nextHyps = liveWave.evaluation!.hypotheses.map((row) =>
                            row.id === h.id ? { ...row, rationale: next } : row,
                          )
                          void patchWave({ evaluation: { hypotheses: nextHyps } })
                        }}
                      />
                    </Field>
                    <ul className="audion-wave-run-stats" aria-label="Hypothesis metrics">
                      <li>
                        <span className="audion-wave-run-stat-label">{t('wave.confidence')}</span>
                        <strong className="audion-wave-run-stat-value ds-text-numeric">
                          {(h.confidence * 100).toFixed(0)}%
                        </strong>
                      </li>
                      <li>
                        <span className="audion-wave-run-stat-label">{t('wave.score')}</span>
                        <strong className="audion-wave-run-stat-value ds-text-numeric">
                          {h.score ?? '—'}
                        </strong>
                      </li>
                    </ul>
                  </div>
                ),
              }))}
            />
          </Panel>
        ) : null}

        <div className="ds-motion-reveal">
          <SoftQBoard
            wave={liveWave}
            onPatchSoft={async (key, entry) => {
              await patchWave({
                evaluation: {
                  softScores: {
                    ...(liveWave.evaluation?.softScores ?? {}),
                    [key]: entry,
                  },
                },
              })
            }}
          />
        </div>
        <div className="ds-motion-reveal">
          <ScreenerPrompts study={study} wave={liveWave} />
        </div>

        {compare ? (
          <Panel
            className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
            aria-label="Wave compare"
          >
            <SectionChrome quiet role="ops" title={t('wave.compare')} meta="delta" metaTone="accent" as="h3" />
            <Hint panel>{compare.summary}</Hint>
            <LedeStrip
              columns={3}
              className="audion-wave-lede-stats"
              aria-label="Compare aggregate deltas"
            >
              {Object.entries(compare.aggregateDelta)
                .slice(0, 3)
                .map(([k, row]) => (
                  <Lede
                    key={k}
                    value={
                      row.delta == null
                        ? '—'
                        : row.delta > 0
                          ? `+${row.delta}`
                          : String(row.delta)
                    }
                    label={k}
                    kind={row.delta == null ? 'empty' : 'text'}
                    tone={
                      row.delta == null
                        ? 'default'
                        : row.delta > 0
                          ? 'pos'
                          : row.delta < 0
                            ? 'neg'
                            : 'ok'
                    }
                  />
                ))}
            </LedeStrip>
            <RankedList>
              {compare.hypothesisDelta.map((row, i) => (
                <RankedRow
                  key={row.id}
                  index={i + 1}
                  label={row.id}
                  value={
                    row.changed
                      ? `${row.baselineVerdict ?? '—'} → ${row.currentVerdict ?? '—'}`
                      : row.currentVerdict ?? '—'
                  }
                  secondary={
                    row.scoreDelta == null
                      ? undefined
                      : `score Δ ${row.scoreDelta > 0 ? '+' : ''}${row.scoreDelta}`
                  }
                />
              ))}
            </RankedList>
          </Panel>
        ) : null}

        {exportMd ? (
          <Panel
            className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
            aria-label="Exported markdown preview"
          >
            <SectionChrome quiet title={t('wave.exportPreview')} as="h3" />
            <pre className="audion-wave-export-preview">{exportMd}</pre>
          </Panel>
        ) : null}
      </div>

      {startOpen ? (
        <ConfirmDialog
          open
          title={
            liveWave.status === 'complete' ||
            liveWave.runs.every((r) => r.agentStatus === 'complete')
              ? 'Restart UX Journey Agent?'
              : 'Start UX Journey Agent?'
          }
          confirmLabel={
            liveWave.status === 'complete' ||
            liveWave.runs.every((r) => r.agentStatus === 'complete')
              ? 'Restart'
              : 'Start'
          }
          onClose={() => setStartOpen(false)}
          onConfirm={() => void onStartConfirm()}
        >
          <p>
            {liveWave.status === 'complete' ||
            liveWave.runs.every((r) => r.agentStatus === 'complete') ? (
              <>
                Wave <strong>{liveWave.waveKey}</strong> is already complete (often with no valid
                evidence after CloudFront 403). Restart clears run results and queues new agent jobs.
              </>
            ) : (
              <>
                Start the <strong>UX Journey Agent</strong> for wave{' '}
                <strong>{liveWave.waveKey}</strong>? This is the official agent entry in audion-v3
                (no separate Agent page).
              </>
            )}
          </p>
        </ConfirmDialog>
      ) : null}

      {compareOpen ? (
        <Dialog
          open
          onClose={() => setCompareOpen(false)}
          className="audion-edit-dialog"
          title={t('wave.compareWaves')}
          actions={
            <>
              <Button variant="ghost" size="md" onClick={() => setCompareOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onComparePick()} disabled={busy}>
                {t('wave.compare')}
              </Button>
            </>
          }
        >
          <div className="audion-edit-form">
            <p className="audion-edit-lede">
              Pick another wave in this study (or self for zero-delta smoke).
            </p>
            <Field label="Other wave" size="md" htmlFor="compare-other">
              <Select
                id="compare-other"
                options={[
                  { value: liveWave.id, label: `${liveWave.waveKey} (self)` },
                  ...otherWaves.map((w) => ({
                    value: w.id,
                    label: `${w.waveKey} · ${w.status}`,
                  })),
                ]}
                value={compareOtherId}
                onChange={setCompareOtherId}
              />
            </Field>
          </div>
        </Dialog>
      ) : null}
    </article>
  )
}
