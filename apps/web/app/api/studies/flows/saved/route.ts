import { NextResponse } from 'next/server'
import type { UxSavedFlowWritePayload } from '@audion-v3/contracts'
import {
  storeListSavedUxFlows,
  storeSaveUxFlow,
} from '../../../../../lib/fixtures/ux-flow-store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const templateFlowId = url.searchParams.get('templateFlowId')?.trim() || undefined
  return NextResponse.json({ items: await storeListSavedUxFlows(templateFlowId) })
}

export async function POST(request: Request) {
  const body = (await request.json()) as UxSavedFlowWritePayload
  try {
    const saved = await storeSaveUxFlow(body)
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
