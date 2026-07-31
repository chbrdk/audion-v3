import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import {
  createApiTokenForOwner,
  listApiTokensForOwner,
  toApiTokenOwnerId,
} from '../../../../lib/settings-api-tokens'

export async function GET() {
  const session = await auth()
  const ownerId = toApiTokenOwnerId(session?.user)
  return NextResponse.json(listApiTokensForOwner(ownerId))
}

export async function POST(req: Request) {
  const session = await auth()
  const ownerId = toApiTokenOwnerId(session?.user)
  const body = (await req.json().catch(() => null)) as { name?: string | null } | null
  const created = createApiTokenForOwner(ownerId, body?.name)
  return NextResponse.json(created, { status: 201 })
}
