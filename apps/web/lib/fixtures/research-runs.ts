/**
 * Fixture research runs — time-based stubs + native in-process job overrides.
 * Spec twin: knowledge/project-research-sse-2026.md · knowledge/ai-native-2026.md
 */

import type {
  ResearchLatestResponse,
  ResearchProgressEvent,
  ResearchRunStatus,
  ResearchStatusResponse,
  ResearchSummarySection,
} from '@audion-v3/contracts'

type RunRecord = {
  projectId: string
  runId: string
  seedUrl: string
  createdAt: number
  stubbed: boolean
  /** Native job overrides time-based stub progression */
  nativeStatus?: ResearchRunStatus
  nativeEvents?: ResearchProgressEvent[]
  nativeSummary?: ResearchSummarySection[] | null
  nativeError?: string | null
  nativeRaw?: Record<string, unknown> | null
}

const runs = new Map<string, RunRecord>()

export function resetResearchRuns(): void {
  runs.clear()
}

export function storeCreateResearchRun(
  projectId: string,
  seedUrl: string,
  stubbed = true,
  createdAt = Date.now(),
): string {
  const runId = stubbed
    ? `research-stub-${projectId}-${Date.now().toString(36)}`
    : `research-native-${projectId}-${Date.now().toString(36)}`
  const baseEvent: ResearchProgressEvent = {
    id: `${runId}-run_queued`,
    eventType: 'run_queued',
    message: 'Research run queued',
    createdAt: new Date(createdAt).toISOString(),
  }
  runs.set(runId, {
    projectId,
    runId,
    seedUrl: seedUrl || 'https://example.com',
    createdAt,
    stubbed,
    nativeStatus: stubbed ? undefined : 'queued',
    nativeEvents: stubbed ? undefined : [baseEvent],
    nativeSummary: stubbed ? undefined : null,
    nativeError: null,
    nativeRaw: null,
  })
  return runId
}

export function storeMarkResearchRunning(runId: string): void {
  const run = runs.get(runId)
  if (!run || run.stubbed) return
  run.nativeStatus = 'running'
  storeAppendResearchEvent(runId, 'run_started', 'Worker picked up run')
}

export function storeAppendResearchEvent(
  runId: string,
  eventType: ResearchProgressEvent['eventType'],
  message: string,
  payload?: Record<string, unknown>,
): void {
  const run = runs.get(runId)
  if (!run) return
  const events = run.nativeEvents ?? []
  events.push({
    id: `${runId}-${eventType}-${events.length}`,
    eventType,
    message,
    createdAt: new Date().toISOString(),
    payload,
  })
  run.nativeEvents = events
}

export function storeCompleteResearchRun(
  runId: string,
  summaryEn: ResearchSummarySection[],
  raw?: Record<string, unknown> | null,
): void {
  const run = runs.get(runId)
  if (!run) return
  run.nativeStatus = 'succeeded'
  run.nativeSummary = summaryEn
  run.nativeRaw = raw ?? null
}

export function storeFailResearchRun(runId: string, error: string): void {
  const run = runs.get(runId)
  if (!run) return
  run.nativeStatus = 'failed'
  run.nativeError = error
  storeAppendResearchEvent(runId, 'run_failed', error)
}

function elapsedMs(run: RunRecord): number {
  return Date.now() - run.createdAt
}

function statusFor(run: RunRecord): ResearchRunStatus {
  if (!run.stubbed && run.nativeStatus) return run.nativeStatus
  const t = elapsedMs(run)
  if (t < 800) return 'queued'
  if (t < 4200) return 'running'
  return 'succeeded'
}

function eventsFor(run: RunRecord): ResearchProgressEvent[] {
  if (!run.stubbed && run.nativeEvents) return run.nativeEvents
  const t = elapsedMs(run)
  const base = run.createdAt
  const mk = (
    offset: number,
    eventType: ResearchProgressEvent['eventType'],
    message: string,
    payload?: Record<string, unknown>,
  ): ResearchProgressEvent => ({
    id: `${run.runId}-${eventType}`,
    eventType,
    message,
    createdAt: new Date(base + offset).toISOString(),
    payload,
  })

  const out: ResearchProgressEvent[] = [mk(0, 'run_queued', 'Research run queued')]
  if (t >= 800) out.push(mk(800, 'run_started', 'Worker picked up run'))
  if (t >= 1200) out.push(mk(1200, 'crawl_start', `Crawl ${run.seedUrl}`))
  if (t >= 2000)
    out.push(
      mk(2000, 'page_fetched', 'Fetched seed page', {
        url: run.seedUrl,
        pages_fetched: 1,
      }),
    )
  if (t >= 2800) out.push(mk(2800, 'crawl_done', 'Crawl finished', { pages_fetched: 3 }))
  if (t >= 3200) out.push(mk(3200, 'synthesize_start', 'Synthesizing summary'))
  if (t >= 3800) out.push(mk(3800, 'synthesize_done', 'Summary synthesized'))
  if (t >= 4200) out.push(mk(4200, 'summary_saved', 'Summary saved'))
  return out
}

function stubSummary(run: RunRecord): ResearchSummarySection[] {
  return [
    {
      key: 'company_overview',
      title: 'Company overview',
      claims: [
        {
          text: `Stub research for ${run.seedUrl || 'seed URL'} — living ICP language for magazine workflows.`,
          citations: [run.seedUrl || 'https://example.com'],
        },
      ],
    },
    {
      key: 'offerings',
      title: 'Offerings',
      claims: [
        {
          text: 'Audience research, persona magazines, and journey validation.',
          citations: [run.seedUrl || 'https://example.com'],
        },
      ],
    },
    {
      key: 'icp_hypotheses',
      title: 'ICP hypotheses',
      claims: [
        {
          text: 'Product leads who need evidence-led roadmaps, not workshop slides.',
          citations: [],
        },
      ],
    },
  ]
}

export function storeResearchStatus(
  projectId: string,
  runId: string,
): ResearchStatusResponse | { error: string; status: number } {
  const run = runs.get(runId)
  if (!run || run.projectId !== projectId) {
    return { error: 'Research run not found', status: 404 }
  }
  return {
    stubbed: run.stubbed,
    projectId,
    runId,
    status: statusFor(run),
    events: eventsFor(run),
    error: run.nativeError ?? null,
  }
}

export function storeResearchLatest(projectId: string): ResearchLatestResponse {
  const projectRuns = [...runs.values()]
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt)
  const latest = projectRuns[0]
  if (!latest || statusFor(latest) !== 'succeeded') {
    return {
      stubbed: latest?.stubbed ?? true,
      projectId,
      runId: latest?.runId ?? null,
      status: latest ? statusFor(latest) : 'missing',
      summaryEn: null,
      raw: null,
    }
  }
  const summaryEn = !latest.stubbed && latest.nativeSummary ? latest.nativeSummary : stubSummary(latest)
  return {
    stubbed: latest.stubbed,
    projectId,
    runId: latest.runId,
    status: 'succeeded',
    summaryEn,
    raw:
      latest.nativeRaw ??
      ({
        summary_en: Object.fromEntries(summaryEn.map((s) => [s.key, { claims: s.claims }])),
      } as Record<string, unknown>),
  }
}

/** SSE body lines for stub/native stream (event: progress / done). */
export function storeResearchSseChunks(
  projectId: string,
  runId: string,
  after?: string | null,
): string[] {
  const status = storeResearchStatus(projectId, runId)
  if (!('events' in status)) {
    return [`event: error\ndata: ${JSON.stringify(status)}\n\n`]
  }
  let events = status.events
  if (after) {
    const idx = events.findIndex((e) => e.id === after || e.createdAt === after)
    if (idx >= 0) events = events.slice(idx + 1)
  }
  const lines = events.map((e) => `event: progress\ndata: ${JSON.stringify(e)}\n\n`)
  if (status.status === 'succeeded' || status.status === 'failed') {
    lines.push(`event: done\ndata: ${JSON.stringify({ runId, status: status.status })}\n\n`)
  }
  return lines
}
