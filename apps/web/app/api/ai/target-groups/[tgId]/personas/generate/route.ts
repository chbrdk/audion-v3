import { NextResponse } from 'next/server'
import type { GeneratePersonasRequest } from '@audion-v3/contracts'
import { runStubGeneratePersonas } from '../../../../../../../lib/ai-workflows'

type Params = { params: Promise<{ tgId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { tgId } = await params
  const body = (await request.json().catch(() => ({}))) as GeneratePersonasRequest
  const result = runStubGeneratePersonas(tgId, body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result, { status: 201 })
}
