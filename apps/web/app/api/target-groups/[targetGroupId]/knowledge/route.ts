import { NextResponse } from 'next/server'
import type { KnowledgeEntryWrite } from '@audion-v3/contracts'
import { createKnowledgeEntry } from '../../../../../lib/knowledge-entries'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../../../../../lib/fixtures/target-group-store'

type Params = { params: Promise<{ targetGroupId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { targetGroupId } = await params
  const tg = await storeTargetGroupDetail(targetGroupId)
  if (!tg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ items: tg.knowledgeEntries, total: tg.knowledgeEntries.length })
}

export async function POST(request: Request, { params }: Params) {
  const { targetGroupId } = await params
  const tg = await storeTargetGroupDetail(targetGroupId)
  if (!tg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = (await request.json()) as KnowledgeEntryWrite
  const entry = createKnowledgeEntry({
    title: body.title ?? '',
    content: body.content ?? '',
  })
  const updated = await storePatchTargetGroup(targetGroupId, {
    name: tg.name,
    segment: tg.segment,
    knowledgeEntries: [...tg.knowledgeEntries, entry],
  })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(entry, { status: 201 })
}
