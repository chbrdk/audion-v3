import { NextResponse } from 'next/server'
import { listPersonaPrompts } from '../../../../lib/settings-persona-prompts'

export async function GET() {
  return NextResponse.json(await listPersonaPrompts())
}
