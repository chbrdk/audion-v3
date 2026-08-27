import { NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { extractFileForKnowledge } from '../../../../../../lib/knowledge/docx-to-knowledge'
import { createKnowledgeEntry } from '../../../../../../lib/knowledge-entries'
import {
  scheduleKnowledgeEntryRagSync,
  tgEntrySourceRef,
} from '../../../../../../lib/knowledge/rag/sync'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../../../../../../lib/fixtures/target-group-store'
import { isPlexonAuthConfigured } from '../../../../../../lib/runtime-config'

type Params = { params: Promise<{ targetGroupId: string }> }

export async function POST(request: Request, { params }: Params) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const { targetGroupId } = await params
  const tg = await storeTargetGroupDetail(targetGroupId)
  if (!tg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  const extracted = await extractFileForKnowledge(file)
  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.error }, { status: extracted.status })
  }

  const entry = createKnowledgeEntry({
    title: extracted.title,
    content: extracted.html,
  })
  const updated = await storePatchTargetGroup(targetGroupId, {
    name: tg.name,
    segment: tg.segment,
    knowledgeEntries: [...tg.knowledgeEntries, entry],
  })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  scheduleKnowledgeEntryRagSync({
    projectId: tg.projectId,
    sourceRef: tgEntrySourceRef(targetGroupId, entry.id),
    title: entry.title,
    text: entry.content,
  })

  return NextResponse.json({ entry, truncated: extracted.truncated }, { status: 201 })
}
