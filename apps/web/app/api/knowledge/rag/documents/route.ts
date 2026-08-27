import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { listKnowledgeRagDocuments } from '../../../../../lib/knowledge/rag/store'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export async function GET(request: Request) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const projectId = new URL(request.url).searchParams.get('projectId')?.trim() || ''
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const items = await listKnowledgeRagDocuments(projectId)
  return NextResponse.json({ items })
}
