import { NextResponse } from 'next/server'
import type { TargetGroupWritePayload } from '@audion-v3/contracts'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../../../../lib/fixtures/target-group-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ targetGroupId: string }> },
) {
  const { targetGroupId } = await context.params
  const targetGroup = storeTargetGroupDetail(targetGroupId)
  if (!targetGroup) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(targetGroup)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ targetGroupId: string }> },
) {
  const { targetGroupId } = await context.params
  const body = (await request.json()) as Partial<TargetGroupWritePayload>
  const targetGroup = storePatchTargetGroup(targetGroupId, body)
  if (!targetGroup) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(targetGroup)
}
