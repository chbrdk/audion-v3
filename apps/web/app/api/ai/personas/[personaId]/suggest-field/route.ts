import { NextResponse } from 'next/server'
import type { SuggestPersonaFieldRequest } from '@audion-v3/contracts'
import { runStubSuggestPersonaField } from '../../../../../../lib/ai-workflows'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestPersonaFieldRequest
  const result = runStubSuggestPersonaField(personaId, body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result, { status: 200 })
}
