import { NextResponse } from 'next/server'
import type { UxStudyFromPackPayload } from '@audion-v3/contracts'
import {
  createStudyFromScenarioPack,
  listScenarioPacks,
} from '../../../../lib/scenario-packs'
import { shouldProxyUxStudiesToApi } from '../../../../lib/ux-studies-proxy'

export async function GET() {
  return NextResponse.json({ items: listScenarioPacks() })
}

export async function POST(request: Request) {
  if (shouldProxyUxStudiesToApi()) {
    return NextResponse.json(
      { error: 'from-pack is fixture/native only (not proxied to v2)' },
      { status: 501 },
    )
  }
  const body = (await request.json()) as UxStudyFromPackPayload
  if (!body?.packId?.trim()) {
    return NextResponse.json({ error: 'packId is required' }, { status: 400 })
  }
  const result = await createStudyFromScenarioPack(body)
  if (!result) {
    return NextResponse.json({ error: 'Unknown packId' }, { status: 404 })
  }
  return NextResponse.json(result, { status: 201 })
}
