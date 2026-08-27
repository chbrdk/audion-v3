import { NextResponse } from 'next/server'
import type { KnowledgeEntryWrite } from '@audion-v3/contracts'
import { updateKnowledgeEntry } from '../../../../../../lib/knowledge-entries'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../../../../../../lib/fixtures/target-group-store'

type Params = { params: Promise<{ targetGroupId: string; entryId: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { targetGroupId, entryId } = await params
  const tg = await storeTargetGroupDetail(targetGroupId)
  if (!tg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const current = tg.knowledgeEntries.find((e) => e.id === entryId)
  if (!current) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  const body = (await request.json()) as KnowledgeEntryWrite
  const entry = updateKnowledgeEntry(current, {
    title: body.title ?? current.title,
    content: body.content ?? current.content,
  })
  await storePatchTargetGroup(targetGroupId, {
    name: tg.name,
    segment: tg.segment,
    knowledgeEntries: tg.knowledgeEntries.map((e) => (e.id === entryId ? entry : e)),
  })
  const { scheduleKnowledgeEntryRagSync, tgEntrySourceRef } = await import(
    '../../../../../../lib/knowledge/rag/sync'
  )
  scheduleKnowledgeEntryRagSync({
    projectId: tg.projectId,
    sourceRef: tgEntrySourceRef(targetGroupId, entry.id),
    title: entry.title,
    text: entry.content,
  })
  return NextResponse.json(entry)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { targetGroupId, entryId } = await params
  const tg = await storeTargetGroupDetail(targetGroupId)
  if (!tg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!tg.knowledgeEntries.some((e) => e.id === entryId)) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }
  await storePatchTargetGroup(targetGroupId, {
    name: tg.name,
    segment: tg.segment,
    knowledgeEntries: tg.knowledgeEntries.filter((e) => e.id !== entryId),
  })
  const { scheduleKnowledgeEntryRagDelete, tgEntrySourceRef } = await import(
    '../../../../../../lib/knowledge/rag/sync'
  )
  scheduleKnowledgeEntryRagDelete({
    projectId: tg.projectId,
    sourceRef: tgEntrySourceRef(targetGroupId, entryId),
  })
  return NextResponse.json({ ok: true })
}
