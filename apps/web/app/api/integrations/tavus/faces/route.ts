import { NextResponse } from 'next/server'
import type { VideoAvatarCatalogResponse } from '@audion-v3/contracts'
import { requireViewer } from '../../../../../lib/resource-access-http'
import { isTavusConfigured } from '../../../../../lib/runtime-config'
import { listTavusFaces, TavusApiError } from '../../../../../lib/tavus/client'

export async function GET(request: Request) {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate.response

  if (!isTavusConfigured()) {
    return NextResponse.json(
      {
        error: 'TAVUS_API_KEY is not set',
        code: 'TAVUS_API_KEY_MISSING',
        configured: false,
        items: [],
      } satisfies VideoAvatarCatalogResponse & { error: string; code: string },
      { status: 503 },
    )
  }

  try {
    const items = await listTavusFaces()
    const body: VideoAvatarCatalogResponse = { configured: true, items }
    return NextResponse.json(body)
  } catch (error) {
    if (error instanceof TavusApiError) {
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
        error: error instanceof Error ? error.message : 'Tavus faces failed',
        configured: true,
        items: [],
      } satisfies VideoAvatarCatalogResponse & { error: string },
      { status: 502 },
    )
  }
}
