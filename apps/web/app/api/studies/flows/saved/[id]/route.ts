import { NextResponse } from 'next/server'
import { getSavedUxFlow, deleteSavedUxFlow } from '../../../../../../lib/fixtures/ux-flow-store'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const saved = getSavedUxFlow(id)
  if (!saved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(saved)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  if (!deleteSavedUxFlow(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
