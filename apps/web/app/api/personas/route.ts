import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storeCreatePersona } from '../../../lib/fixtures/persona-store'

export async function POST(request: Request) {
  const body = (await request.json()) as PersonaWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const persona = await storeCreatePersona({
    ...body,
    role: body.role?.trim() || 'Persona',
  })
  return NextResponse.json(persona, { status: 201 })
}
