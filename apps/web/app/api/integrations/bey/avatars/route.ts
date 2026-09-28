import { NextResponse } from 'next/server'
import type { VideoAvatarCatalogResponse } from '@audion-v3/contracts'
import { BeyApiError, listBeyAvatars } from '../../../../../lib/bey/client'
import { requireViewer } from '../../../../../lib/resource-access-http'
import { isBeyConfigured } from '../../../../../lib/runtime-config'

export async function GET(request: Request) {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate.response

  if (!isBeyConfigured()) {
    return NextResponse.json(
      {
        error: 'BEY_API_KEY is not set',
        code: 'BEY_API_KEY_MISSING',
        configured: false,
        items: [],
      } satisfies VideoAvatarCatalogResponse & { error: string; code: string },
      { status: 503 },
    )
  }

  try {
    const items = await listBeyAvatars()
    const body: VideoAvatarCatalogResponse = { configured: true, items }
    return NextResponse.json(body)
  } catch (error) {
    if (error instanceof BeyApiError) {
      return NextResponse.json(
        {
          error: error.message,
          detail: error.detail,
          configured: true,
          items: [],
        } satisfies VideoAvatarCatalogResponse & { error: string; detail?: string },
        { status: error.status },
      )
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Beyond Presence avatars failed',
        configured: true,
        items: [],
      } satisfies VideoAvatarCatalogResponse & { error: string },
      { status: 502 },
    )
  }
}
