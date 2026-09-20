import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storeCreatePersona } from '../../../lib/fixtures/persona-store'
import { storeSeedDefaultNaturalVoice } from '../../../lib/fixtures/persona-prompts-store'
import { requireProjectAccess, requireViewer } from '../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'
import { syncPersonaTavusPal } from '../../../lib/tavus/sync'

export async function POST(request: Request) {
  const body = (await request.json()) as PersonaWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
  if (isPlexonAuthConfigured()) {
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  } else {
    const gate = await requireViewer(request)
    if (!gate.ok) return gate.response
  }

  const persona = await storeCreatePersona({
    ...body,
    projectId: projectId || body.projectId,
    role: body.role?.trim() || 'Persona',
  })
  await storeSeedDefaultNaturalVoice(persona.id)
  const synced = await syncPersonaTavusPal(persona)
  return NextResponse.json(synced.persona, { status: 201 })
}
