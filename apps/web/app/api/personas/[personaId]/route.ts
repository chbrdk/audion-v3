import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storePatchPersona } from '../../../../lib/fixtures/persona-store'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ personaId: string }> },
) {
  const { personaId } = await context.params
  const body = (await request.json()) as Partial<PersonaWritePayload>
  const persona = storePatchPersona(personaId, body)
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(persona)
}
