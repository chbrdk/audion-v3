import { NextResponse } from 'next/server'
import { fetchSharePersona } from '../../../../../lib/chat/share-persona'

type Params = { params: Promise<{ personaId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { personaId } = await params
  const projectId = new URL(request.url).searchParams.get('projectId')

  const result = await fetchSharePersona(personaId, projectId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
