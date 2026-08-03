'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  QueueJobDetail,
  QueueJobList,
  QueueJobStatus,
  QueueStatsResponse,
} from '@audion-v3/contracts'
import { Alert, Button, EmptyState, Hint, Panel, Text, ToggleGroup } from '@msqdx/ui'
import { ConfirmDialog } from '../lib/msqdx-ui-client'
import { Lede, LedeStrip } from '../lib/msqdx-ui'
import { paths } from '../lib/paths'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 12)}…` : id
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function QueueDashboardPanel({
  projectId = null,
}: {
  projectId?: string | null
}) {
  const [status, setStatus] = useState<string>('all')
  const [stats, setStats] = useState<QueueStatsResponse | null>(null)
  const [list, setList] = useState<QueueJobList | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<QueueJobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryOpen, setRetryOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const statsQs = new URLSearchParams()
      if (projectId) statsQs.set('projectId', projectId)
      const listQs = new URLSearchParams({
        status,
        page: '1',
        pageSize: '20',
      })
      if (projectId) listQs.set('projectId', projectId)

      const [statsRes, listRes] = await Promise.all([
        fetch(`${paths.routes.apiQueueStats}?${statsQs}`),
        fetch(`${paths.routes.apiQueueJobs}?${listQs}`),
      ])
      if (!statsRes.ok) throw new Error(`Stats failed (${statsRes.status})`)
      if (!listRes.ok) throw new Error(`Jobs failed (${listRes.status})`)
      setStats((await statsRes.json()) as QueueStatsResponse)
      setList((await listRes.json()) as QueueJobList)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    }
  }, [projectId, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load()
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(paths.routes.apiQueueJobDetail(selectedId))
        if (!res.ok) throw new Error(`Detail failed (${res.status})`)
        const job = (await res.json()) as QueueJobDetail
        if (!cancelled) setDetail(job)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load job')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  async function onRetry() {
    if (!detail || detail.status !== 'failed') return
    setRetrying(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiQueueJobRetry(detail.id), { method: 'POST' })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Retry failed (${res.status})`)
      }
      const job = (await res.json()) as QueueJobDetail
      setDetail(job)
      setRetryOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="audion-stack" data-testid="queue-dashboard">
      <Hint panel>
        Fixture document-processing jobs (V2 queue shape). No Redis/Celery — demo store only.
      </Hint>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {stats ? (
        <LedeStrip columns={4} aria-label="Queue stats" data-testid="queue-stats">
          <Lede value={String(stats.pending)} label="Pending" kind="number" />
          <Lede value={String(stats.processing)} label="Processing" kind="number" />
          <Lede value={String(stats.completed)} label="Completed" kind="number" tone="pos" />
          <Lede
            value={String(stats.failed)}
            label="Failed"
            kind="number"
            tone={stats.failed > 0 ? 'low' : undefined}
          />
        </LedeStrip>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <ToggleGroup
          aria-label="Job status filter"
          value={status}
          onChange={setStatus}
          options={STATUS_FILTERS}
        />
        <Button type="button" size="sm" variant="subtle" onClick={() => void load()} data-testid="queue-refresh">
          Refresh
        </Button>
      </div>

      <div
        className="audion-queue-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: '1.25rem',
        }}
      >
        <Panel className="audion-stack" data-testid="queue-job-list">
          <Text role="headline" as="h2">
            Jobs
          </Text>
          {!list?.items.length ? (
            <EmptyState>No jobs for this filter.</EmptyState>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="audion-stack">
              {list.items.map((job) => {
                const active = job.id === selectedId
                return (
                  <li key={job.id}>
                    <button
                      type="button"
                      data-testid={`queue-job-${job.id}`}
                      onClick={() => setSelectedId(job.id)}
                      className="audion-tg-card"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        outline: active ? '2px solid var(--color-theme-accent, currentColor)' : undefined,
                      }}
                    >
                      <Panel as="div" variant="card" className="audion-tg-card-panel">
                        <Text role="headline" as="span" className="audion-tg-card-title">
                          {job.filename}
                        </Text>
                        <p className="audion-tg-card-meta">
                          <span data-status={job.status}>{job.status}</span>
                          <span aria-hidden>·</span>
                          <span>{Math.round(job.progress)}%</span>
                          <span aria-hidden>·</span>
                          <span>{shortId(job.id)}</span>
                        </p>
                        {job.error ? (
                          <Text role="meta">{job.error.slice(0, 80)}</Text>
                        ) : (
                          <Text role="meta">{formatWhen(job.createdAt)}</Text>
                        )}
                      </Panel>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel className="audion-stack" data-testid="queue-job-detail">
          <Text role="headline" as="h2">
            Detail
          </Text>
          {!detail ? (
            <Text role="body">Select a job to inspect status, progress, and errors.</Text>
          ) : (
            <>
              <dl className="audion-settings-account">
                <dt>Filename</dt>
                <dd>{detail.filename}</dd>
                <dt>Status</dt>
                <dd data-status={detail.status}>{detail.status}</dd>
                <dt>Progress</dt>
                <dd>{Math.round(detail.progress)}%</dd>
                <dt>Job id</dt>
                <dd>
                  <code>{detail.id}</code>
                </dd>
                <dt>Document</dt>
                <dd>
                  <code>{detail.documentId}</code>
                </dd>
                <dt>Project</dt>
                <dd>
                  <Link href={paths.routes.projectDetail(detail.projectId)} className="audion-link">
                    {detail.projectId}
                  </Link>
                </dd>
                <dt>Size</dt>
                <dd>{detail.sizeBytes != null ? `${detail.sizeBytes.toLocaleString()} bytes` : '—'}</dd>
                <dt>Created</dt>
                <dd>{formatWhen(detail.createdAt)}</dd>
                <dt>Updated</dt>
                <dd>{formatWhen(detail.updatedAt)}</dd>
                {detail.error ? (
                  <>
                    <dt>Error</dt>
                    <dd>{detail.error}</dd>
                  </>
                ) : null}
              </dl>
              {detail.status === 'failed' ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRetryOpen(true)}
                  data-testid="queue-retry"
                >
                  Retry
                </Button>
              ) : null}
            </>
          )}
        </Panel>
      </div>

      {retryOpen && detail ? (
        <ConfirmDialog
          open
          title="Retry failed job?"
          confirmLabel={retrying ? 'Retrying…' : 'Retry'}
          onClose={() => setRetryOpen(false)}
          onConfirm={() => void onRetry()}
        >
          <p>
            Reset <strong>{detail.filename}</strong> to pending and clear the error. Fixture store
            only — no real worker is started.
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  )
}

export type { QueueJobStatus }
