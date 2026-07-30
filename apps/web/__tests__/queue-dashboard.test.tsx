import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueueDashboardPanel } from '../components/queue-dashboard-panel'
import { SettingsAdminHubPanel } from '../components/settings-admin-hub-panel'
import { paths } from '../lib/paths'
import type { QueueJobDetail, QueueJobList, QueueStatsResponse } from '@audion-v3/contracts'

vi.mock('next/navigation', () => ({
  usePathname: () => '/queue',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

const failedJob: QueueJobDetail = {
  id: 'job-doc-deck-04',
  projectId: 'proj-brand-lab',
  documentId: 'doc-pitch-deck',
  filename: 'pitch-deck.pptx',
  sizeBytes: 4_200_000,
  status: 'failed',
  progress: 38,
  error: 'OCR timeout while extracting slide text',
  createdAt: '2026-07-29T10:00:00.000Z',
  updatedAt: '2026-07-29T11:00:00.000Z',
}

const stats: QueueStatsResponse = {
  pending: 2,
  processing: 2,
  completed: 2,
  failed: 2,
  total: 8,
}

const list: QueueJobList = {
  items: [failedJob],
  total: 1,
  page: 1,
  pageSize: 20,
}

describe('QueueDashboardPanel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads stats/list, shows detail, and retries failed job', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith(paths.routes.apiQueueStats)) {
        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.startsWith(paths.routes.apiQueueJobs) && !url.includes('/retry')) {
        if (url.includes(failedJob.id) && !init?.method) {
          return new Response(JSON.stringify(failedJob), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(list), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url === paths.routes.apiQueueJobDetail(failedJob.id)) {
        return new Response(JSON.stringify(failedJob), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url === paths.routes.apiQueueJobRetry(failedJob.id) && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ ...failedJob, status: 'pending', progress: 0, error: null }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<QueueDashboardPanel />)

    await waitFor(() => {
      expect(screen.getByTestId('queue-stats')).toBeTruthy()
    })
    expect(screen.getByText('pitch-deck.pptx')).toBeTruthy()

    fireEvent.click(screen.getByTestId(`queue-job-${failedJob.id}`))
    await waitFor(() => {
      expect(screen.getByTestId('queue-retry')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('queue-retry'))
    await waitFor(() => {
      expect(screen.getByText(/Retry failed job/i)).toBeTruthy()
    })
    const dialog = screen.getByRole('dialog')
    const confirmButtons = dialog.querySelectorAll('button')
    const confirm = Array.from(confirmButtons).find((b) => b.textContent?.trim() === 'Retry')
    expect(confirm).toBeTruthy()
    fireEvent.click(confirm!)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiQueueJobRetry(failedJob.id),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})

describe('SettingsAdminHubPanel queue entry', () => {
  afterEach(() => cleanup())

  it('links to /queue', () => {
    render(<SettingsAdminHubPanel />)
    expect(screen.getByRole('link', { name: /Queue/i }).getAttribute('href')).toBe(
      paths.routes.queue,
    )
  })
})
