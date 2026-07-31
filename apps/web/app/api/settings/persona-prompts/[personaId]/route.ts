import { NextResponse } from 'next/server'
import {
  getPersonaPromptDetail,
  resetPersonaPrompt,
  updatePersonaPrompt,
} from '../../../../../lib/settings-persona-prompts'

type Ctx = { params: Promise<{ personaId: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { personaId } = await ctx.params
  const result = await getPersonaPromptDetail(decodeURIComponent(personaId))
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}

export async function PUT(req: Request, ctx: Ctx) {
  const { personaId } = await ctx.params
  const body = (await req.json().catch(() => null)) as {
    systemPrompt?: string
    systemPromptDe?: string | null
    templateVersion?: string | null
  } | null
  const result = await updatePersonaPrompt(decodeURIComponent(personaId), {
    systemPrompt: body?.systemPrompt ?? '',
    systemPromptDe: body?.systemPromptDe,
    templateVersion: body?.templateVersion,
  })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { personaId } = await ctx.params
  const result = await resetPersonaPrompt(decodeURIComponent(personaId))
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
