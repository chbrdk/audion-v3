'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useT } from '../lib/user-prefs'

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
  const t = useT()
  const [status, setStatus] = useState<string>('all')
  const [stats, setStats] = useState<QueueStatsResponse | null>(null)
  const [list, setList] = useState<QueueJobList | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<QueueJobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryOpen, setRetryOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const statusFilters = useMemo(
    () => [
      { value: 'all', label: t('queue.all') },
      { value: 'pending', label: t('queue.pending') },
      { value: 'processing', label: t('queue.processing') },
      { value: 'completed', label: t('queue.completed') },
      { value: 'failed', label: t('queue.failed') },
    ],
    [t],
  )

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
      setError(e instanceof Error ? e.message : t('queue.loadFailed'))
    }
  }, [projectId, status, t])

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
        if (!cancelled) setError(e instanceof Error ? e.message : t('queue.jobLoadFailed'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, t])

  async function onRetry() {
    if (!detail || detail.status !== 'failed') return
    setRetrying(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiQueueJobRetry(detail.id), { method: 'POST' })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `${t('queue.retryFailed')} (${res.status})`)
      }
      const job = (await res.json()) as QueueJobDetail
      setDetail(job)
      setRetryOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('queue.retryFailed'))
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="audion-stack" data-testid="queue-dashboard">
      <Hint panel>{t('queue.hint')}</Hint>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {stats ? (
        <LedeStrip columns={4} aria-label={t('queue.statsAria')} data-testid="queue-stats">
          <Lede value={String(stats.pending)} label={t('queue.pending')} kind="number" />
          <Lede value={String(stats.processing)} label={t('queue.processing')} kind="number" />
          <Lede value={String(stats.completed)} label={t('queue.completed')} kind="number" tone="pos" />
          <Lede
            value={String(stats.failed)}
            label={t('queue.failed')}
            kind="number"
            tone={stats.failed > 0 ? 'low' : undefined}
          />
        </LedeStrip>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <ToggleGroup
          aria-label={t('queue.filterAria')}
          value={status}
          onChange={setStatus}
          options={statusFilters}
        />
        <Button type="button" size="sm" variant="subtle" onClick={() => void load()} data-testid="queue-refresh">
          {t('common.refresh')}
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
            {t('queue.jobs')}
          </Text>
          {!list?.items.length ? (
            <EmptyState>{t('queue.empty')}</EmptyState>
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
            {t('queue.detail')}
          </Text>
          {!detail ? (
            <Text role="body">{t('queue.selectHint')}</Text>
          ) : (
            <>
              <dl className="audion-settings-account">
                <dt>{t('queue.filename')}</dt>
                <dd>{detail.filename}</dd>
                <dt>{t('queue.status')}</dt>
                <dd data-status={detail.status}>{detail.status}</dd>
                <dt>{t('queue.progress')}</dt>
                <dd>{Math.round(detail.progress)}%</dd>
                <dt>{t('queue.jobId')}</dt>
                <dd>
                  <code>{detail.id}</code>
                </dd>
                <dt>{t('queue.document')}</dt>
                <dd>
                  <code>{detail.documentId}</code>
                </dd>
                <dt>{t('queue.project')}</dt>
                <dd>
                  <Link href={paths.routes.projectDetail(detail.projectId)} className="audion-link">
                    {detail.projectId}
                  </Link>
                </dd>
                <dt>{t('queue.size')}</dt>
                <dd>
                  {detail.sizeBytes != null
                    ? t('queue.bytes', { n: detail.sizeBytes.toLocaleString() })
                    : '—'}
                </dd>
                <dt>{t('queue.created')}</dt>
                <dd>{formatWhen(detail.createdAt)}</dd>
                <dt>{t('queue.updated')}</dt>
                <dd>{formatWhen(detail.updatedAt)}</dd>
                {detail.error ? (
                  <>
                    <dt>{t('queue.error')}</dt>
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
                  {t('common.retry')}
                </Button>
              ) : null}
            </>
          )}
        </Panel>
      </div>

      {retryOpen && detail ? (
        <ConfirmDialog
          open
          title={t('queue.retryTitle')}
          confirmLabel={retrying ? t('queue.retrying') : t('common.retry')}
          cancelLabel={t('common.cancel')}
          onClose={() => setRetryOpen(false)}
          onConfirm={() => void onRetry()}
        >
          <p>{t('queue.retryBody', { filename: detail.filename })}</p>
        </ConfirmDialog>
      ) : null}
    </div>
  )
}

export type { QueueJobStatus }
