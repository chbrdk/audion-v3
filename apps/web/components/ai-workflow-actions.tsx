'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  AiSuggestionItem,
  GenerateJourneyResponse,
  GeneratePersonasResponse,
  ResearchStartResponse,
  SuggestPersonasResponse,
  SuggestTargetGroupsResponse,
} from '@audion-v3/contracts'
import { Button, Field, Input, Textarea } from '@msqdx/ui'
import { Dialog, Select } from '../lib/msqdx-ui-client'
import { AI_WORKFLOW_TARGETS, targetHint } from '../lib/ai-workflow-targets'
import { paths } from '../lib/paths'
import { AiActionButton } from './ai-action-button'

type AiOptions = {
  projects: Array<{ id: string; name: string }>
  targetGroups: Array<{ id: string; name: string; segment: string; projectId: string | null }>
}

async function loadOptions(): Promise<AiOptions> {
  const res = await fetch(paths.routes.apiAiOptions)
  if (!res.ok) throw new Error('Failed to load AI options')
  return res.json() as Promise<AiOptions>
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

function StubTargetNote({ hint, lede, stubbed }: { hint: string; lede: string; stubbed?: boolean }) {
  const isStub = stubbed !== false
  return (
    <>
      <p className="audion-edit-lede">{lede}</p>
      <p className="audion-ai-target-hint" title={hint}>
        {isStub ? (
          <>
            Stub · target <code>{hint}</code>
          </>
        ) : (
          <>
            Live · <code>{hint}</code>
          </>
        )}
      </p>
    </>
  )
}

function SuggestionList({
  items,
  onAccept,
  accepting,
}: {
  items: AiSuggestionItem[]
  onAccept: (item: AiSuggestionItem) => void
  accepting: string | null
}) {
  return (
    <ul className="audion-ai-suggestions">
      {items.map((item) => (
        <li key={item.id}>
          <div className="audion-ai-suggestions-copy">
            <span className="audion-ai-suggestions-title">{item.title}</span>
            {item.subtitle ? (
              <span className="audion-ai-suggestions-sub">{item.subtitle}</span>
            ) : null}
            {item.description ? <p>{item.description}</p> : null}
          </div>
          <Button
            type="button"
            size="md"
            variant="ghost"
            disabled={accepting === item.id}
            onClick={() => onAccept(item)}
          >
            {accepting === item.id ? 'Creating…' : 'Create'}
          </Button>
        </li>
      ))}
    </ul>
  )
}

/* ─── Generate personas ─── */

export function GeneratePersonasAiButton({
  targetGroupId,
  defaultSegment,
  defaultDescription,
  variant = 'button',
}: {
  targetGroupId?: string
  defaultSegment?: string
  defaultDescription?: string | null
  variant?: 'button' | 'card'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<AiOptions | null>(null)
  const [tgId, setTgId] = useState(targetGroupId ?? '')
  const [segment, setSegment] = useState(defaultSegment ?? '')
  const [description, setDescription] = useState(defaultDescription ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratePersonasResponse | null>(null)
  const hint = targetHint('generatePersonas')

  useEffect(() => {
    if (!open) return
    setResult(null)
    setError(null)
    setTgId(targetGroupId ?? '')
    setSegment(defaultSegment ?? '')
    setDescription(defaultDescription ?? '')
    if (!targetGroupId) {
      void loadOptions()
        .then(setOptions)
        .catch(() => setError('Could not load target groups'))
    }
  }, [open, targetGroupId, defaultSegment, defaultDescription])

  useEffect(() => {
    if (!tgId || !options) return
    const tg = options.targetGroups.find((g) => g.id === tgId)
    if (tg && !segment) setSegment(tg.segment)
  }, [tgId, options, segment])

  async function run() {
    if (!tgId) {
      setError('Pick a target group')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await postJson<GeneratePersonasResponse>(
        paths.routes.apiAiGeneratePersonas(tgId),
        { segment, description: description || null, filter_mode: 'auto', count: 2 },
      )
      setResult(data)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          className="audion-tg-card audion-tg-card--create audion-tg-card--ai"
          title={hint}
          onClick={() => setOpen(true)}
        >
          <span className="audion-tg-card-panel audion-tg-card-panel--create">
            <span className="audion-tg-card-title">Generate with AI</span>
            <p className="audion-tg-card-meta">
              <span>Stub → personas/generate</span>
            </p>
          </span>
        </button>
      ) : (
        <AiActionButton label="Generate with AI" targetHint={hint} onClick={() => setOpen(true)} />
      )}
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          className="audion-edit-dialog"
          title="Generate personas"
          actions={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
                {result ? 'Close' : 'Cancel'}
              </Button>
              {!result ? (
                <Button type="button" size="md" disabled={busy} onClick={() => void run()}>
                  {busy ? 'Generating…' : 'Generate'}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="audion-edit-form">
            <StubTargetNote
              lede="Create draft personas for a segment — same flow as V2 generate."
              hint={AI_WORKFLOW_TARGETS.generatePersonas.upstreamPath}
              stubbed={result?.stubbed}
            />
            {!targetGroupId ? (
              <Field label="Target group" size="md" className="audion-edit-field">
                <Select
                  size="md"
                  value={tgId}
                  onChange={setTgId}
                  options={[
                    { value: '', label: 'Select…' },
                    ...(options?.targetGroups.map((g) => ({
                      value: g.id,
                      label: `${g.name} · ${g.segment}`,
                    })) ?? []),
                  ]}
                />
              </Field>
            ) : null}
            <Field label="Segment" size="md" className="audion-edit-field">
              <Input size="md" block value={segment} onChange={(e) => setSegment(e.target.value)} />
            </Field>
            <Field label="Brief (optional)" size="md" className="audion-edit-field">
              <Textarea
                size="md"
                block
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </Field>
            {error ? (
              <p className="audion-edit-error" role="alert">
                {error}
              </p>
            ) : null}
            {result ? (
              <p className="audion-ai-result" role="status">
                Created {result.personas.length} persona
                {result.personas.length === 1 ? '' : 's'}:{' '}
                {result.personas.map((p) => p.name).join(', ')}
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  )
}

/* ─── Suggest target groups ─── */

export function SuggestTargetGroupsAiButton({
  projectId,
  variant = 'button',
}: {
  projectId?: string
  variant?: 'button' | 'card'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<AiOptions | null>(null)
  const [pid, setPid] = useState(projectId ?? '')
  const [busy, setBusy] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[] | null>(null)
  const [targetPath, setTargetPath] = useState(AI_WORKFLOW_TARGETS.suggestTargetGroups.upstreamPath)
  const [stubbed, setStubbed] = useState(true)
  const hint = targetHint('suggestTargetGroups')

  useEffect(() => {
    if (!open) return
    setSuggestions(null)
    setError(null)
    setStubbed(true)
    setPid(projectId ?? '')
    if (!projectId) {
      void loadOptions()
        .then(setOptions)
        .catch(() => setError('Could not load projects'))
    }
  }, [open, projectId])

  async function run() {
    if (!pid) {
      setError('Pick a project')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await postJson<SuggestTargetGroupsResponse>(
        paths.routes.apiAiSuggestTargetGroups(pid),
        { max_suggestions: 5, output_locale: 'en' },
      )
      setSuggestions(data.suggestions)
      setTargetPath(data.target.path)
      setStubbed(data.stubbed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suggest failed')
    } finally {
      setBusy(false)
    }
  }

  async function accept(item: AiSuggestionItem) {
    setAccepting(item.id)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiTargetGroups, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.title,
          segment: item.subtitle || 'Segment',
          description: item.description ?? null,
          status: 'draft',
          projectId: pid,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || 'Create failed')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setAccepting(null)
    }
  }

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          className="audion-tg-card audion-tg-card--create audion-tg-card--ai"
          title={hint}
          onClick={() => setOpen(true)}
        >
          <span className="audion-tg-card-panel audion-tg-card-panel--create">
            <span className="audion-tg-card-title">Suggest with AI</span>
            <p className="audion-tg-card-meta">
              <span>Stub → suggest-target-groups</span>
            </p>
          </span>
        </button>
      ) : (
        <AiActionButton label="Suggest with AI" targetHint={hint} onClick={() => setOpen(true)} />
      )}
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          className="audion-edit-dialog"
          title="Suggest target groups"
          actions={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
                Close
              </Button>
              {!suggestions ? (
                <Button type="button" size="md" disabled={busy} onClick={() => void run()}>
                  {busy ? 'Suggesting…' : 'Suggest'}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="audion-edit-form">
            <StubTargetNote
              lede="Propose audience segments for this project, then create the ones you keep."
              hint={targetPath}
              stubbed={stubbed}
            />
            {!projectId ? (
              <Field label="Project" size="md" className="audion-edit-field">
                <Select
                  size="md"
                  value={pid}
                  onChange={setPid}
                  options={[
                    { value: '', label: 'Select…' },
                    ...(options?.projects.map((p) => ({ value: p.id, label: p.name })) ?? []),
                  ]}
                />
              </Field>
            ) : null}
            {error ? (
              <p className="audion-edit-error" role="alert">
                {error}
              </p>
            ) : null}
            {suggestions ? (
              <SuggestionList items={suggestions} onAccept={accept} accepting={accepting} />
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  )
}

/* ─── Suggest personas (project context) ─── */

export function SuggestPersonasAiButton({
  projectId,
  targetGroups,
}: {
  projectId: string
  targetGroups: Array<{ id: string; name: string; segment: string }>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tgId, setTgId] = useState(targetGroups[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[] | null>(null)
  const [targetPath, setTargetPath] = useState(AI_WORKFLOW_TARGETS.suggestPersonas.upstreamPath)
  const [stubbed, setStubbed] = useState(true)
  const hint = targetHint('suggestPersonas')

  useEffect(() => {
    if (!open) return
    setSuggestions(null)
    setError(null)
    setStubbed(true)
    setTgId(targetGroups[0]?.id ?? '')
  }, [open, targetGroups])

  async function run() {
    if (!tgId) {
      setError('Pick a target group')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await postJson<SuggestPersonasResponse>(
        paths.routes.apiAiSuggestPersonas(projectId),
        { target_group_id: tgId, max_suggestions: 3, output_locale: 'en' },
      )
      setSuggestions(data.suggestions)
      setTargetPath(data.target.path)
      setStubbed(data.stubbed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suggest failed')
    } finally {
      setBusy(false)
    }
  }

  async function accept(item: AiSuggestionItem) {
    setAccepting(item.id)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiPersonas, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.title,
          role: item.subtitle || 'Persona',
          status: 'draft',
          projectId,
          bio: item.description ?? null,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || 'Create failed')
      }
      const persona = (await res.json()) as { id: string }
      if (tgId) {
        const detailRes = await fetch(paths.routes.apiTargetGroupDetail(tgId))
        const existingIds: string[] = []
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as {
            linkedPersonas?: Array<{ id: string }>
          }
          existingIds.push(...(detail.linkedPersonas?.map((p) => p.id) ?? []))
        }
        await fetch(paths.routes.apiTargetGroupDetail(tgId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkedPersonaIds: [...existingIds, persona.id] }),
        })
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setAccepting(null)
    }
  }

  return (
    <>
      <AiActionButton label="Suggest personas" targetHint={hint} onClick={() => setOpen(true)} />
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          className="audion-edit-dialog"
          title="Suggest personas"
          actions={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
                Close
              </Button>
              {!suggestions ? (
                <Button type="button" size="md" disabled={busy || !tgId} onClick={() => void run()}>
                  {busy ? 'Suggesting…' : 'Suggest'}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="audion-edit-form">
            <StubTargetNote
              lede="Propose persona briefs for a target group, then create selected profiles."
              hint={targetPath}
              stubbed={stubbed}
            />
            <Field label="Target group" size="md" className="audion-edit-field">
              <Select
                size="md"
                value={tgId}
                onChange={setTgId}
                options={[
                  { value: '', label: targetGroups.length ? 'Select…' : 'No target groups yet' },
                  ...targetGroups.map((g) => ({
                    value: g.id,
                    label: `${g.name} · ${g.segment}`,
                  })),
                ]}
              />
            </Field>
            {error ? (
              <p className="audion-edit-error" role="alert">
                {error}
              </p>
            ) : null}
            {suggestions ? (
              <SuggestionList items={suggestions} onAccept={(item) => void accept(item)} accepting={accepting} />
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  )
}

/* ─── Research start ─── */

export function ResearchStartAiButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [seedUrl, setSeedUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [job, setJob] = useState<ResearchStartResponse | null>(null)
  const [events, setEvents] = useState<
    Array<{ id: string; eventType: string; message: string }>
  >([])
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [latestSummary, setLatestSummary] = useState<string | null>(null)
  const hint = targetHint('researchStart')

  useEffect(() => {
    if (!open) return
    setJob(null)
    setError(null)
    setSeedUrl('')
    setEvents([])
    setRunStatus(null)
    setLatestSummary(null)
  }, [open])

  useEffect(() => {
    if (!job?.jobId || !open) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const res = await fetch(
          `${paths.routes.apiAiResearchStatus(projectId)}?run_id=${encodeURIComponent(job!.jobId)}`,
        )
        const data = (await res.json().catch(() => null)) as {
          status?: string
          events?: Array<{ id: string; eventType: string; message: string }>
          error?: string
        } | null
        if (!res.ok) throw new Error(data?.error || `Status failed (${res.status})`)
        if (cancelled) return
        setRunStatus(data?.status ?? null)
        setEvents(data?.events ?? [])
        if (data?.status === 'succeeded') {
          const latestRes = await fetch(paths.routes.apiAiResearchLatest(projectId))
          const latest = (await latestRes.json().catch(() => null)) as {
            summaryEn?: Array<{ title: string; claims: Array<{ text: string }> }> | null
          } | null
          if (!cancelled && latest?.summaryEn?.length) {
            setLatestSummary(
              latest.summaryEn
                .map((s) => `${s.title}: ${s.claims.map((c) => c.text).join(' ')}`)
                .join('\n'),
            )
          }
          return
        }
        if (data?.status === 'failed') return
        timer = setTimeout(() => void poll(), 900)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Status poll failed')
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [job?.jobId, open, projectId])

  async function run() {
    setBusy(true)
    setError(null)
    setEvents([])
    setLatestSummary(null)
    try {
      const data = await postJson<ResearchStartResponse>(paths.routes.apiAiResearchStart(projectId), {
        seed_url: seedUrl,
        max_pages: 20,
        max_depth: 2,
      })
      setJob(data)
      setRunStatus(data.status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research start failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AiActionButton label="Start research" targetHint={hint} onClick={() => setOpen(true)} />
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          className="audion-edit-dialog"
          title="Start research"
          actions={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
                Close
              </Button>
              {!job ? (
                <Button type="button" size="md" disabled={busy} onClick={() => void run()}>
                  {busy ? 'Starting…' : 'Start'}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="audion-edit-form">
            <StubTargetNote
              lede="Queue a research crawl, then follow progress (poll spine; SSE available)."
              hint={AI_WORKFLOW_TARGETS.researchStart.upstreamPath}
              stubbed={job?.stubbed}
            />
            <Field label="Seed URL" size="md" className="audion-edit-field">
              <Input
                size="md"
                block
                value={seedUrl}
                onChange={(e) => setSeedUrl(e.target.value)}
                placeholder="https://…"
                disabled={Boolean(job)}
              />
            </Field>
            {error ? (
              <p className="audion-edit-error" role="alert">
                {error}
              </p>
            ) : null}
            {job ? (
              <div className="audion-research-progress" role="status">
                <p className="audion-ai-result">
                  Job <code>{job.jobId}</code> · {runStatus ?? job.status}
                  {job.stubbed ? ' · stub' : ' · live'}
                </p>
                {events.length ? (
                  <ul className="audion-research-events">
                    {events.map((ev) => (
                      <li key={ev.id}>
                        <code>{ev.eventType}</code> — {ev.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="audion-edit-lede">Waiting for progress…</p>
                )}
                {latestSummary ? (
                  <pre className="audion-research-summary">{latestSummary}</pre>
                ) : null}
              </div>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  )
}

/* ─── Generate journey ─── */

export function GenerateJourneyAiButton({
  projectId,
  defaultTargetGroupId,
  variant = 'button',
}: {
  projectId?: string | null
  defaultTargetGroupId?: string | null
  variant?: 'button' | 'card'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<AiOptions | null>(null)
  const [tgId, setTgId] = useState(defaultTargetGroupId ?? '')
  const [journeyType, setJourneyType] = useState('customer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateJourneyResponse | null>(null)
  const workflowId = projectId ? 'generateJourneyFromProject' : 'generateJourney'
  const hint = targetHint(workflowId)

  useEffect(() => {
    if (!open) return
    setResult(null)
    setError(null)
    setTgId(defaultTargetGroupId ?? '')
    void loadOptions()
      .then(setOptions)
      .catch(() => setError('Could not load options'))
  }, [open, defaultTargetGroupId])

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const body = {
        target_group_id: tgId || null,
        journey_type: journeyType,
        project_id: projectId ?? null,
        output_locale: 'en',
      }
      const url = projectId
        ? paths.routes.apiAiGenerateJourneyFromProject(projectId)
        : paths.routes.apiAiGenerateJourney
      const data = await postJson<GenerateJourneyResponse>(url, body)
      setResult(data)
      router.refresh()
      router.push(paths.routes.journeyDetail(data.journey.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          className="audion-tg-card audion-tg-card--create audion-tg-card--ai"
          title={hint}
          onClick={() => setOpen(true)}
        >
          <span className="audion-tg-card-panel audion-tg-card-panel--create">
            <span className="audion-tg-card-title">Generate with AI</span>
            <p className="audion-tg-card-meta">
              <span>Stub → journeys/generate</span>
            </p>
          </span>
        </button>
      ) : (
        <AiActionButton label="Generate journey" targetHint={hint} onClick={() => setOpen(true)} />
      )}
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          className="audion-edit-dialog"
          title="Generate journey"
          actions={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="md" disabled={busy} onClick={() => void run()}>
                {busy ? 'Generating…' : 'Generate'}
              </Button>
            </>
          }
        >
          <div className="audion-edit-form">
            <StubTargetNote
              lede="Draft a journey with starter phases from the selected segment."
              hint={
                projectId
                  ? AI_WORKFLOW_TARGETS.generateJourneyFromProject.upstreamPath
                  : AI_WORKFLOW_TARGETS.generateJourney.upstreamPath
              }
            />
            <Field label="Target group (optional)" size="md" className="audion-edit-field">
              <Select
                size="md"
                value={tgId}
                onChange={setTgId}
                options={[
                  { value: '', label: 'None' },
                  ...(options?.targetGroups
                    .filter((g) => !projectId || g.projectId === projectId || !g.projectId)
                    .map((g) => ({ value: g.id, label: `${g.name} · ${g.segment}` })) ?? []),
                ]}
              />
            </Field>
            <Field label="Journey type" size="md" className="audion-edit-field">
              <Input size="md" block value={journeyType} onChange={(e) => setJourneyType(e.target.value)} />
            </Field>
            {error ? (
              <p className="audion-edit-error" role="alert">
                {error}
              </p>
            ) : null}
            {result ? (
              <p className="audion-ai-result" role="status">
                Created {result.journey.name} ({result.journey.phaseCount} phases)
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  )
}

/* ─── Project audience AI band ─── */

export function ProjectAiActions({
  projectId,
  targetGroups,
}: {
  projectId: string
  targetGroups: Array<{ id: string; name: string; segment: string }>
}) {
  return (
    <div className="audion-ai-actions" aria-label="AI actions">
      <SuggestTargetGroupsAiButton projectId={projectId} />
      <SuggestPersonasAiButton projectId={projectId} targetGroups={targetGroups} />
      <ResearchStartAiButton projectId={projectId} />
      <GenerateJourneyAiButton projectId={projectId} />
    </div>
  )
}
