import { NextResponse } from 'next/server'
import type { KnowledgeRagIngestPayload, KnowledgeRagSourceType } from '@audion-v3/contracts'
import { auth } from '../../../../../auth'
import { extractDocxText } from '../../../../../lib/chat/extract-docx'
import { ingestKnowledgeText } from '../../../../../lib/knowledge/rag/store'
import { paths } from '../../../../../lib/paths'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

const SOURCE_TYPES = new Set<KnowledgeRagSourceType>([
  'docx',
  'chapter',
  'research',
  'entry',
])

export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const projectId = String(form.get('projectId') || '').trim()
      const title = String(form.get('title') || '').trim()
      const sourceRef = String(form.get('sourceRef') || '').trim() || null
      const replaceDocumentId = String(form.get('replaceDocumentId') || '').trim() || null
      const file = form.get('file')
      if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
      }
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 })
      }
      const filename = file.name || 'document.docx'
      if (!filename.toLowerCase().endsWith('.docx')) {
        return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 415 })
      }
      if (file.size > paths.chatDocumentUploadMaxBytes) {
        return NextResponse.json({ error: 'Document exceeds max upload size' }, { status: 413 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const extracted = await extractDocxText(buffer, paths.chatDocumentUploadMaxChars)
      const result = await ingestKnowledgeText({
        projectId,
        sourceType: 'docx',
        sourceRef,
        title: title || filename,
        text: extracted.text,
        replaceDocumentId,
      })
      if (result.status === 'failed') {
        return NextResponse.json(result, { status: 422 })
      }
      return NextResponse.json(result)
    }

    const body = (await request.json()) as KnowledgeRagIngestPayload
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const sourceType = body.sourceType
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const text = typeof body.text === 'string' ? body.text : ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!SOURCE_TYPES.has(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const result = await ingestKnowledgeText({
      projectId,
      sourceType,
      sourceRef: body.sourceRef ?? null,
      title,
      text,
      replaceDocumentId: body.replaceDocumentId ?? null,
    })
    if (result.status === 'failed') {
      return NextResponse.json(result, { status: 422 })
    }
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
