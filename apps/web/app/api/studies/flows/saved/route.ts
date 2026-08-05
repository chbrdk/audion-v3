import { NextResponse } from 'next/server'
import type { UxSavedFlowWritePayload } from '@audion-v3/contracts'
import { auth } from '../../../../../auth'
import { savedFlowScopeFromSession } from '../../../../../lib/ux-flow-acl'
import {
  storeListSavedUxFlows,
  storeSaveUxFlow,
} from '../../../../../lib/fixtures/ux-flow-store'

export async function GET(request: Request) {
  const session = await auth()
  const scope = savedFlowScopeFromSession(session?.user)
  const url = new URL(request.url)
  const templateFlowId = url.searchParams.get('templateFlowId')?.trim() || undefined
  return NextResponse.json({ items: await storeListSavedUxFlows(templateFlowId, scope) })
}

export async function POST(request: Request) {
  const session = await auth()
  const scope = savedFlowScopeFromSession(session?.user)
  const body = (await request.json()) as UxSavedFlowWritePayload
  try {
    const saved = await storeSaveUxFlow(body, scope)
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /Forbidden/i.test(message) ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
