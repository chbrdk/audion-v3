import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storeCreatePersona } from '../../../lib/fixtures/persona-store'
import { syncPersonaTavusPal } from '../../../lib/tavus/sync'

export async function POST(request: Request) {
  const body = (await request.json()) as PersonaWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const persona = await storeCreatePersona({
    ...body,
    role: body.role?.trim() || 'Persona',
  })
  const synced = await syncPersonaTavusPal(persona)
  return NextResponse.json(synced.persona, { status: 201 })
}
