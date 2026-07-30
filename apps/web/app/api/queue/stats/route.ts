import { NextResponse } from 'next/server'
import { storeQueueStats } from '../../../../lib/fixtures/queue-store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  return NextResponse.json(storeQueueStats(projectId))
}
