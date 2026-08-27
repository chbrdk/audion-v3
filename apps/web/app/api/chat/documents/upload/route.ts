import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { putChatDocument } from '../../../../../lib/chat/document-upload-store'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

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

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await putChatDocument({
    filename: file.name || 'document.docx',
    buffer,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({
    documentId: result.documentId,
    filename: result.filename,
    charCount: result.charCount,
    truncated: result.truncated,
  })
}
