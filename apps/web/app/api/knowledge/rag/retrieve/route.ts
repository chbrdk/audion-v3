import { NextResponse } from 'next/server'
import type { KnowledgeRagRetrievePayload } from '@audion-v3/contracts'
import { retrieveKnowledgeSources } from '../../../../../lib/knowledge/rag/store'
import { requireProjectAccess } from '../../../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

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
  return NextResponse.json(result)
}
