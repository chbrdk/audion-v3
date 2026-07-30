import { NextResponse } from 'next/server'
import type { ProjectEasySetupRequest } from '@audion-v3/contracts'
import { auth } from '../../../../auth'
import { runEasySetup } from '../../../../lib/easy-setup'
import { getPlexonProfile } from '../../../../lib/plexon-auth'
import { isPlexonAuthConfigured } from '../../../../lib/runtime-config'

export async function POST(request: Request) {
  let body: ProjectEasySetupRequest
  try {
    body = (await request.json()) as ProjectEasySetupRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const session = await auth()
  const ownerEmail = session?.user?.email || undefined
  const ownerPlexonUserId = session?.user?.id || null

  let platformCompanyId: string | null = null
  if (ownerPlexonUserId && isPlexonAuthConfigured()) {
    const profile = await getPlexonProfile(ownerPlexonUserId)
    platformCompanyId = profile?.default_platform_company_id ?? null
  }

  const result = await runEasySetup(body, {
    ownerEmail,
    ownerPlexonUserId,
    platformCompanyId,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, { status: 201 })
}
