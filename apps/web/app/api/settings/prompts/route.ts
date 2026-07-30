import { NextResponse } from 'next/server'
import { listAssistTemplates } from '../../../../lib/settings-admin'

export async function GET() {
  return NextResponse.json(listAssistTemplates())
}
