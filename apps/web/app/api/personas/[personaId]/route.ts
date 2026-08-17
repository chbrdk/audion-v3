import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storePatchPersona } from '../../../../lib/fixtures/persona-store'
import { syncPersonaTavusPal } from '../../../../lib/tavus/sync'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ personaId: string }> },
) {
  const { personaId } = await context.params
  const body = (await request.json()) as Partial<PersonaWritePayload>
  const persona = await storePatchPersona(personaId, body)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const synced = await syncPersonaTavusPal(persona)
  return NextResponse.json(synced.persona)
}
