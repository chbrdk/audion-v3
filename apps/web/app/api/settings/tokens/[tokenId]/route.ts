import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { revokeApiTokenForOwner, toApiTokenOwnerId } from '../../../../../lib/settings-api-tokens'

type Ctx = { params: Promise<{ tokenId: string }> }

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth()
  const ownerId = toApiTokenOwnerId(session?.user)
  const { tokenId } = await ctx.params
  const result = revokeApiTokenForOwner(decodeURIComponent(tokenId), ownerId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return new NextResponse(null, { status: 204 })
}
