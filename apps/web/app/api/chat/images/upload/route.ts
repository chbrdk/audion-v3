import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { putChatImage } from '../../../../../lib/chat/image-upload-store'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  let body: { image?: string }
  try {
    body = (await request.json()) as { image?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const image = typeof body.image === 'string' ? body.image : ''
  if (!image.trim()) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 })
  }

  const result = putChatImage(image)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ imageId: result.imageId })
}
