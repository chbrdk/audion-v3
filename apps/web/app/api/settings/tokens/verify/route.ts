import { NextResponse } from 'next/server'
import { verifyApiTokenBearer } from '../../../../../lib/settings-api-tokens'

export async function POST(req: Request) {
  const result = verifyApiTokenBearer(req.headers.get('authorization'))
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
