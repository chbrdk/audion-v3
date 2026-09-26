import { NextResponse } from 'next/server'
import type { KnowledgeRagRetrievePayload } from '@audion-v3/contracts'
import { getRequestUser } from '../../../../../lib/auth-api-token'
import { retrieveKnowledgeSources } from '../../../../../lib/knowledge/rag/store'
import { requireProjectAccess } from '../../../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'
import { reportRetrievalQuery } from '../../../../../lib/usage-report'

export async function POST(request: Request) {
  let body: KnowledgeRagRetrievePayload
  try {
    body = (await request.json()) as KnowledgeRagRetrievePayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!projectId || !query) {
    return NextResponse.json({ error: 'projectId and query are required' }, { status: 400 })
  }

  if (isPlexonAuthConfigured()) {
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  }

  const topK =
    typeof body.topK === 'number' && Number.isFinite(body.topK) ? Math.floor(body.topK) : undefined

  const result = await retrieveKnowledgeSources({ projectId, query, topK })
  const viewer = await getRequestUser(request)
  reportRetrievalQuery({
    userId: viewer?.id,
    queries: 1,
    projectId,
    surface: 'knowledge.rag.retrieve',
  })
  return NextResponse.json(result)
}
