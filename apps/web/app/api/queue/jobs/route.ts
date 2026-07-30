import { NextResponse } from 'next/server'
import type { QueueJobStatus } from '@audion-v3/contracts'
import { storeQueueList } from '../../../../lib/fixtures/queue-store'

const STATUSES = new Set<QueueJobStatus | 'all'>([
  'all',
  'pending',
  'processing',
  'completed',
  'failed',
])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const statusRaw = searchParams.get('status') || 'all'
  if (!STATUSES.has(statusRaw as QueueJobStatus | 'all')) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
  }
  const page = Number(searchParams.get('page') || '1')
  const pageSize = Number(searchParams.get('pageSize') || '20')
  const list = storeQueueList({
    status: statusRaw as QueueJobStatus | 'all',
    projectId: searchParams.get('projectId'),
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
  })
  return NextResponse.json(list)
}
