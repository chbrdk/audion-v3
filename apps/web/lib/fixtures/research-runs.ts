/**
 * Fixture research runs — poll spine + SSE events (2026 async job pattern).
 * Spec twin: knowledge/project-research-sse-2026.md
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
  const runId = `research-stub-${projectId}-${Date.now().toString(36)}`
  runs.set(runId, {
    projectId,
    runId,
    seedUrl: seedUrl || 'https://example.com',
    createdAt,
    stubbed,
  })
  return runId
}

function elapsedMs(run: RunRecord): number {
  return Date.now() - run.createdAt
}

function statusFor(run: RunRecord): ResearchRunStatus {
  const t = elapsedMs(run)
  if (t < 800) return 'queued'
  if (t < 4200) return 'running'
  return 'succeeded'
}

function eventsFor(run: RunRecord): ResearchProgressEvent[] {
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
    error: null,
  }
}

export function storeResearchLatest(projectId: string): ResearchLatestResponse {
  const projectRuns = [...runs.values()]
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt)
  const latest = projectRuns[0]
  if (!latest || statusFor(latest) !== 'succeeded') {
    return {
      stubbed: true,
      projectId,
      runId: latest?.runId ?? null,
      status: latest ? statusFor(latest) : 'missing',
      summaryEn: null,
      raw: null,
    }
  }
  const summaryEn = stubSummary(latest)
  return {
    stubbed: latest.stubbed,
    projectId,
    runId: latest.runId,
    status: 'succeeded',
    summaryEn,
    raw: {
      summary_en: Object.fromEntries(
        summaryEn.map((s) => [s.key, { claims: s.claims }]),
      ),
    },
  }
}

/** SSE body lines for stub stream (event: progress / done). */
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
  const lines = events.map(
    (e) => `event: progress\ndata: ${JSON.stringify(e)}\n\n`,
  )
  if (status.status === 'succeeded' || status.status === 'failed') {
    lines.push(`event: done\ndata: ${JSON.stringify({ runId, status: status.status })}\n\n`)
  }
  return lines
}
