import { NextResponse } from 'next/server'
import type { KnowledgeRagRetrievePayload } from '@audion-v3/contracts'
import { auth } from '../../../../../auth'
import { retrieveKnowledgeSources } from '../../../../../lib/knowledge/rag/store'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

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

  const topK =
    typeof body.topK === 'number' && Number.isFinite(body.topK) ? Math.floor(body.topK) : undefined

  const result = await retrieveKnowledgeSources({ projectId, query, topK })
  return NextResponse.json(result)
}
