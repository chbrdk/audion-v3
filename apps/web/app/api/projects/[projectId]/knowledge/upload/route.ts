import { NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import {
  extractFileForKnowledge,
  newDocxChapterId,
} from '../../../../../../lib/knowledge/docx-to-knowledge'
import {
  joinCompanyContext,
  resolveKnowledgeChapters,
} from '../../../../../../lib/project-knowledge'
import {
  storePatchProject,
  storeProjectDetail,
} from '../../../../../../lib/fixtures/project-store'
import { isPlexonAuthConfigured } from '../../../../../../lib/runtime-config'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const { projectId } = await params
  const project = await storeProjectDetail(projectId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  const existing = resolveKnowledgeChapters(project.knowledgeChapters, project.companyContext)
  const chapter = {
    id: newDocxChapterId(),
    title: extracted.title,
    body: extracted.html,
  }
  const knowledgeChapters = [...existing, chapter]
  const patched = await storePatchProject(projectId, {
    knowledgeChapters,
    companyContext: joinCompanyContext(knowledgeChapters),
  })
  if (!patched) {
    return NextResponse.json({ error: 'Failed to save knowledge' }, { status: 500 })
  }

  return NextResponse.json({
    chapter,
    truncated: extracted.truncated,
  })
}
