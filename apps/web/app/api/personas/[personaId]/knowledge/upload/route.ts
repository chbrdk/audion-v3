import { NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { extractDocxForKnowledge } from '../../../../../../lib/knowledge/docx-to-knowledge'
import { createKnowledgeEntry } from '../../../../../../lib/knowledge-entries'
import {
  personaEntrySourceRef,
  scheduleKnowledgeEntryRagSync,
} from '../../../../../../lib/knowledge/rag/sync'
import { storePatchPersona, storePersonaDetail } from '../../../../../../lib/fixtures/persona-store'
import { isPlexonAuthConfigured } from '../../../../../../lib/runtime-config'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const { personaId } = await params
  const persona = await storePersonaDetail(personaId)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  const extracted = await extractDocxForKnowledge(file)
  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.error }, { status: extracted.status })
  }

  const entry = createKnowledgeEntry({
    title: extracted.title,
    content: extracted.html,
  })
  await storePatchPersona(personaId, {
    name: persona.name,
    role: persona.role,
    knowledgeEntries: [...persona.knowledgeEntries, entry],
  })
  scheduleKnowledgeEntryRagSync({
    projectId: persona.projectId,
    sourceRef: personaEntrySourceRef(personaId, entry.id),
    title: entry.title,
    text: entry.content,
  })

  return NextResponse.json({ entry, truncated: extracted.truncated }, { status: 201 })
}
