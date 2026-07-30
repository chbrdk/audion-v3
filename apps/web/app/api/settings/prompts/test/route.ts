import { NextResponse } from 'next/server'
import type { SettingsAssistPromptTestRequest } from '@audion-v3/contracts'
import { testAssistPrompt } from '../../../../../lib/settings-admin'

export async function POST(request: Request) {
  let body: SettingsAssistPromptTestRequest
  try {
    body = (await request.json()) as SettingsAssistPromptTestRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await testAssistPrompt(body)
  if ('error' in result && 'status' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
