/**
 * Client for the V3-owned UX Journey Agent (Python FastAPI).
 * Env: UX_JOURNEY_AGENT_URL, UX_JOURNEY_AGENT_SECRET
 */

export type UxJourneyAgentStep = {
  step?: number
  action?: string
  target?: string
  result?: string
  reasoning?: string
  observations?: unknown
  screenshot?: string | null
  screenshotUrl?: string | null
  timestamp?: string
}

export type UxJourneyAgentJobStatus = {
  jobId: string
  status: 'running' | 'complete' | 'error' | string
  url?: string
  task?: string
  error?: string | null
  lastObservedAt?: string | null
  result?: {
    success?: boolean
    steps?: UxJourneyAgentStep[]
    scorecard?: Record<string, unknown> | null
    summary?: string
    videoUrl?: string | null
  } | null
}

function agentBase(): string | null {
  const raw = process.env.UX_JOURNEY_AGENT_URL?.trim()
  return raw ? raw.replace(/\/$/, '') : null
}

export function isUxJourneyAgentConfigured(): boolean {
  return Boolean(agentBase())
}

function agentHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const secret = process.env.UX_JOURNEY_AGENT_SECRET?.trim()
  if (secret) headers.set('X-UX-Journey-Secret', secret)
  return headers
}

export async function uxJourneyAgentStart(input: {
  url: string
  task: string
  persona?: Record<string, unknown> | null
  maxSteps?: number | null
}): Promise<{ jobId: string }> {
  const base = agentBase()
  if (!base) throw new Error('UX_JOURNEY_AGENT_URL is not configured')
  const res = await fetch(`${base}/run`, {
    method: 'POST',
    headers: agentHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({
      url: input.url,
      task: input.task,
      persona: input.persona ?? undefined,
      max_steps: input.maxSteps ?? undefined,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`UX journey agent start failed (${res.status}): ${detail.slice(0, 400)}`)
  }
  const json = (await res.json()) as { jobId?: string }
  if (!json.jobId) throw new Error('UX journey agent returned no jobId')
  return { jobId: json.jobId }
}

export async function uxJourneyAgentGet(jobId: string): Promise<UxJourneyAgentJobStatus> {
  const base = agentBase()
  if (!base) throw new Error('UX_JOURNEY_AGENT_URL is not configured')
  const res = await fetch(`${base}/run/${encodeURIComponent(jobId)}`, {
    headers: agentHeaders({ Accept: 'application/json' }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`UX journey agent status failed (${res.status}): ${detail.slice(0, 400)}`)
  }
  return (await res.json()) as UxJourneyAgentJobStatus
}

export async function uxJourneyAgentCancel(jobId: string, reason?: string): Promise<void> {
  const base = agentBase()
  if (!base) return
  const qs = reason ? `?reason=${encodeURIComponent(reason.slice(0, 500))}` : ''
  await fetch(`${base}/run/${encodeURIComponent(jobId)}/cancel${qs}`, {
    method: 'POST',
    headers: agentHeaders({ Accept: 'application/json' }),
    cache: 'no-store',
  }).catch(() => undefined)
}

/** Proxy raw agent paths (live/video) — returns upstream Response. */
export async function uxJourneyAgentProxy(
  pathSuffix: string,
  init?: RequestInit,
): Promise<Response> {
  const base = agentBase()
  if (!base) throw new Error('UX_JOURNEY_AGENT_URL is not configured')
  const path = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`
  const headers = agentHeaders(init?.headers)
  return fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' })
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

export async function uxJourneyAgentPollUntilDone(
  jobId: string,
  options?: {
    intervalMs?: number
    maxMs?: number
    onProgress?: (status: UxJourneyAgentJobStatus) => void | Promise<void>
  },
): Promise<UxJourneyAgentJobStatus> {
  const intervalMs = options?.intervalMs ?? 2000
  const maxMs = options?.maxMs ?? 15 * 60 * 1000
  const started = Date.now()
  let lastSteps = -1
  for (;;) {
    const status = await uxJourneyAgentGet(jobId)
    const steps = status.result?.steps?.length ?? 0
    if (steps !== lastSteps || status.status !== 'running') {
      lastSteps = steps
      await options?.onProgress?.(status)
    }
    if (status.status === 'complete' || status.status === 'error') return status
    if (Date.now() - started > maxMs) {
      await uxJourneyAgentCancel(jobId, 'Hard timeout in Audion BFF')
      throw new Error('UX journey agent poll timed out')
    }
    await sleep(intervalMs)
  }
}
