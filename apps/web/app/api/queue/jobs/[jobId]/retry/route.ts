import { NextResponse } from 'next/server'
import { storeRetryQueueJob } from '../../../../../../lib/fixtures/queue-store'

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params
  const result = storeRetryQueueJob(jobId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
