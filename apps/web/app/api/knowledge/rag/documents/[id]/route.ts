import { NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { deleteKnowledgeRagDocument } from '../../../../../../lib/knowledge/rag/store'
import { isPlexonAuthConfigured } from '../../../../../../lib/runtime-config'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await deleteKnowledgeRagDocument(id)
  return NextResponse.json({ ok: true })
}
