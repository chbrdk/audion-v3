import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storeDeletePersona, storePatchPersona, storePersonaDetail } from '../../../../lib/fixtures/persona-store'
import { requirePersonaAccess } from '../../../../lib/resource-access-http'
import { syncPersonaTavusPal } from '../../../../lib/tavus/sync'

export async function GET(
  request: Request,
  context: { params: Promise<{ personaId: string }> },
) {
  const { personaId } = await context.params
  const access = await requirePersonaAccess(request, personaId)
  if (!access.ok) return access.response
  const persona = await storePersonaDetail(personaId)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(persona)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ personaId: string }> },
) {
  const { personaId } = await context.params
  const access = await requirePersonaAccess(request, personaId)
  if (!access.ok) return access.response
  const body = (await request.json()) as Partial<PersonaWritePayload>
  const persona = await storePatchPersona(personaId, body)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const synced = await syncPersonaTavusPal(persona)
  return NextResponse.json(synced.persona)
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ personaId: string }> },
) {
  const { personaId } = await context.params
  const access = await requirePersonaAccess(request, personaId)
  if (!access.ok) return access.response
  const ok = await storeDeletePersona(personaId)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
