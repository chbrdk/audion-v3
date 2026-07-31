import { NextResponse } from 'next/server'
import {
  getAssistTemplateSummary,
  resetAssistTemplate,
  updateAssistTemplate,
} from '../../../../../lib/settings-admin'

type Ctx = { params: Promise<{ templateId: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { templateId } = await ctx.params
  const result = await getAssistTemplateSummary(decodeURIComponent(templateId))
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}

export async function PUT(req: Request, ctx: Ctx) {
  const { templateId } = await ctx.params
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const result = await updateAssistTemplate(decodeURIComponent(templateId), {
    system: typeof body?.system === 'string' || body?.system === null ? (body.system as string | null) : undefined,
    user: typeof body?.user === 'string' || body?.user === null ? (body.user as string | null) : undefined,
    prompt:
      typeof body?.prompt === 'string' || body?.prompt === null
        ? (body.prompt as string | null)
        : undefined,
  })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { templateId } = await ctx.params
  const result = await resetAssistTemplate(decodeURIComponent(templateId))
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
