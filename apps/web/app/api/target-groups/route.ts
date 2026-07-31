import { NextResponse } from 'next/server'
import type { TargetGroupWritePayload } from '@audion-v3/contracts'
import { storeCreateTargetGroup } from '../../../lib/fixtures/target-group-store'

export async function POST(request: Request) {
  const body = (await request.json()) as TargetGroupWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const targetGroup = await storeCreateTargetGroup({
    ...body,
    segment: body.segment?.trim() || 'Segment',
  })
  return NextResponse.json(targetGroup, { status: 201 })
}
