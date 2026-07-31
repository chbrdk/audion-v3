import { NextResponse } from 'next/server'
import type { KnowledgeEntryWrite } from '@audion-v3/contracts'
import { createKnowledgeEntry } from '../../../../../lib/knowledge-entries'
import { storePatchPersona, storePersonaDetail } from '../../../../../lib/fixtures/persona-store'

type Params = { params: Promise<{ personaId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { personaId } = await params
  const persona = await storePersonaDetail(personaId)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    items: persona.knowledgeEntries,
    total: persona.knowledgeEntries.length,
  })
}

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const persona = await storePersonaDetail(personaId)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = (await request.json()) as KnowledgeEntryWrite
  const entry = createKnowledgeEntry({
    title: body.title ?? '',
    content: body.content ?? '',
  })
  await storePatchPersona(personaId, {
    name: persona.name,
    role: persona.role,
    knowledgeEntries: [...persona.knowledgeEntries, entry],
  })
  return NextResponse.json(entry, { status: 201 })
}
