/**
 * Fixture document-processing jobs for the Queue dashboard (V2 shape).
 * Spec: knowledge/queue-dashboard-2026.md
 */

import type {
  QueueJobDetail,
  QueueJobList,
  QueueJobListQuery,
  QueueJobStatus,
  QueueJobSummary,
  QueueStatsResponse,
} from '@audion-v3/contracts'

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

function seedJobs(): QueueJobDetail[] {
  return [
    {
      id: 'job-doc-brief-01',
      projectId: 'proj-audion-core',
      documentId: 'doc-brand-brief',
      filename: 'brand-brief.pdf',
      sizeBytes: 248_320,
      status: 'completed',
      progress: 100,
      error: null,
      createdAt: iso(86_400_000),
      updatedAt: iso(85_000_000),
    },
    {
      id: 'job-doc-interview-02',
      projectId: 'proj-audion-core',
      documentId: 'doc-interview-notes',
      filename: 'interview-notes.docx',
      sizeBytes: 92_100,
      status: 'processing',
      progress: 62,
      error: null,
      createdAt: iso(3_600_000),
      updatedAt: iso(600_000),
    },
    {
      id: 'job-doc-survey-03',
      projectId: 'proj-brand-lab',
      documentId: 'doc-survey-export',
      filename: 'survey-export.csv',
      sizeBytes: 1_024_000,
      status: 'pending',
      progress: 0,
      error: null,
      createdAt: iso(1_800_000),
      updatedAt: iso(1_800_000),
    },
    {
      id: 'job-doc-deck-04',
      projectId: 'proj-brand-lab',
      documentId: 'doc-pitch-deck',
      filename: 'pitch-deck.pptx',
      sizeBytes: 4_200_000,
      status: 'failed',
      progress: 38,
      error: 'OCR timeout while extracting slide text',
      createdAt: iso(72_000_000),
      updatedAt: iso(70_000_000),
    },
    {
      id: 'job-doc-journey-05',
      projectId: 'proj-journey-ops',
      documentId: 'doc-journey-map',
      filename: 'journey-map.png',
      sizeBytes: 880_000,
      status: 'completed',
      progress: 100,
      error: null,
      createdAt: iso(172_800_000),
      updatedAt: iso(170_000_000),
    },
    {
      id: 'job-doc-transcript-06',
      projectId: 'proj-journey-ops',
      documentId: 'doc-call-transcript',
      filename: 'call-transcript.txt',
      sizeBytes: 45_000,
      status: 'failed',
      progress: 12,
      error: 'Unsupported encoding; expected UTF-8',
      createdAt: iso(14_400_000),
      updatedAt: iso(14_000_000),
    },
    {
      id: 'job-doc-research-07',
      projectId: 'proj-audion-core',
      documentId: 'doc-competitor-pdf',
      filename: 'competitor-scan.pdf',
      sizeBytes: 3_100_000,
      status: 'processing',
      progress: 21,
      error: null,
      createdAt: iso(900_000),
      updatedAt: iso(120_000),
    },
    {
      id: 'job-doc-faq-08',
      projectId: 'proj-brand-lab',
      documentId: 'doc-faq',
      filename: 'faq-bundle.zip',
      sizeBytes: 512_000,
      status: 'pending',
      progress: 0,
      error: null,
      createdAt: iso(300_000),
      updatedAt: iso(300_000),
    },
  ]
}

let jobs: QueueJobDetail[] = seedJobs()

export function resetQueueStore(): void {
  jobs = seedJobs()
}

function toSummary(job: QueueJobDetail): QueueJobSummary {
  return { ...job }
}

function filtered(query: QueueJobListQuery = {}): QueueJobDetail[] {
  let list = [...jobs]
  if (query.projectId?.trim()) {
    const pid = query.projectId.trim()
    list = list.filter((j) => j.projectId === pid)
  }
  const status = query.status
  if (status && status !== 'all') {
    list = list.filter((j) => j.status === status)
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return list
}

export function storeQueueList(query: QueueJobListQuery = {}): QueueJobList {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20))
  const all = filtered(query)
  const start = (page - 1) * pageSize
  const items = all.slice(start, start + pageSize).map(toSummary)
  return { items, total: all.length, page, pageSize }
}

export function storeQueueDetail(id: string): QueueJobDetail | null {
  return jobs.find((j) => j.id === id) ?? null
}

export function storeQueueStats(projectId?: string | null): QueueStatsResponse {
  const list = filtered({ projectId: projectId ?? null, status: 'all' })
  const count = (status: QueueJobStatus) => list.filter((j) => j.status === status).length
  return {
    pending: count('pending'),
    processing: count('processing'),
    completed: count('completed'),
    failed: count('failed'),
    total: list.length,
  }
}

export type QueueStoreError = { error: string; status: number }

export function storeRetryQueueJob(id: string): QueueJobDetail | QueueStoreError {
  const index = jobs.findIndex((j) => j.id === id)
  if (index < 0) return { error: 'Job not found', status: 404 }
  const current = jobs[index]!
  if (current.status !== 'failed') {
    return { error: 'Only failed jobs can be retried', status: 400 }
  }
  const next: QueueJobDetail = {
    ...current,
    status: 'pending',
    progress: 0,
    error: null,
    updatedAt: new Date().toISOString(),
  }
  jobs = [...jobs.slice(0, index), next, ...jobs.slice(index + 1)]
  return next
}
