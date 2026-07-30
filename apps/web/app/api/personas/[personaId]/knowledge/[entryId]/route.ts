import { NextResponse } from 'next/server'
import type { KnowledgeEntryWrite } from '@audion-v3/contracts'
import { updateKnowledgeEntry } from '../../../../../../lib/knowledge-entries'
import { storePatchPersona, storePersonaDetail } from '../../../../../../lib/fixtures/persona-store'

type Params = { params: Promise<{ personaId: string; entryId: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { personaId, entryId } = await params
  const persona = storePersonaDetail(personaId)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const current = persona.knowledgeEntries.find((e) => e.id === entryId)
  if (!current) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  const body = (await request.json()) as KnowledgeEntryWrite
  const entry = updateKnowledgeEntry(current, {
    title: body.title ?? current.title,
    content: body.content ?? current.content,
  })
  storePatchPersona(personaId, {
    name: persona.name,
    role: persona.role,
    knowledgeEntries: persona.knowledgeEntries.map((e) => (e.id === entryId ? entry : e)),
  })
  return NextResponse.json(entry)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { personaId, entryId } = await params
  const persona = storePersonaDetail(personaId)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!persona.knowledgeEntries.some((e) => e.id === entryId)) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }
  storePatchPersona(personaId, {
    name: persona.name,
    role: persona.role,
    knowledgeEntries: persona.knowledgeEntries.filter((e) => e.id !== entryId),
  })
  return NextResponse.json({ ok: true })
}
