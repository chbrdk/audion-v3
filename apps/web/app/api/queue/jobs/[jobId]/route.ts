import { NextResponse } from 'next/server'
import { storeQueueDetail } from '../../../../../lib/fixtures/queue-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params
  const job = storeQueueDetail(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  return NextResponse.json(job)
}
