import { afterEach, describe, expect, it } from 'vitest'
import {
  resetQueueStore,
  storeQueueDetail,
  storeQueueList,
  storeQueueStats,
  storeRetryQueueJob,
} from '../lib/fixtures/queue-store'

describe('queue-store', () => {
  afterEach(() => {
    resetQueueStore()
  })

  it('lists seeded jobs and supports status filter', () => {
    const all = storeQueueList({ status: 'all' })
    expect(all.total).toBeGreaterThanOrEqual(6)
    const failed = storeQueueList({ status: 'failed' })
    expect(failed.items.every((j) => j.status === 'failed')).toBe(true)
    expect(failed.total).toBeGreaterThanOrEqual(1)
  })

  it('filters by projectId', () => {
    const list = storeQueueList({ projectId: 'proj-audion-core', status: 'all' })
    expect(list.items.length).toBeGreaterThan(0)
    expect(list.items.every((j) => j.projectId === 'proj-audion-core')).toBe(true)
  })

  it('returns stats that sum to total', () => {
    const stats = storeQueueStats()
    expect(stats.pending + stats.processing + stats.completed + stats.failed).toBe(stats.total)
  })

  it('retries failed jobs only', () => {
    const failed = storeQueueList({ status: 'failed' }).items[0]
    expect(failed).toBeTruthy()
    const retried = storeRetryQueueJob(failed!.id)
    expect('id' in retried).toBe(true)
    if (!('id' in retried)) return
    expect(retried.status).toBe('pending')
    expect(retried.progress).toBe(0)
    expect(retried.error).toBeNull()
    expect(storeQueueDetail(failed!.id)?.status).toBe('pending')

    const completed = storeQueueList({ status: 'completed' }).items[0]!
    expect(storeRetryQueueJob(completed.id)).toEqual({
      error: 'Only failed jobs can be retried',
      status: 400,
    })
  })

  it('returns 404 for unknown job retry', () => {
    expect(storeRetryQueueJob('missing-job')).toEqual({
      error: 'Job not found',
      status: 404,
    })
  })
})
