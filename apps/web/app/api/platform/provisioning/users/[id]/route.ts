import { NextResponse } from 'next/server'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  isProvisioningAuthorized,
} from '../../../../../../lib/plexon-contract'
import { getPlexonServiceSecret } from '../../../../../../lib/runtime-config'
import { storeProvisionedUser } from '../../../../../../lib/fixtures/project-store'

function jsonWithContract(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set(PLEXON_CONTRACT_VERSION_HEADER, PLEXON_FEDERATION_CONTRACT_VERSION)
  return NextResponse.json(body, { ...init, headers })
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: plexonUserId } = await context.params
  if (!plexonUserId?.trim()) {
    return NextResponse.json({ error: 'user id required' }, { status: 400 })
  }
  let body: {
    email?: string
    name?: string | null
    desiredState?: string
    contractVersion?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (body.contractVersion !== PLEXON_FEDERATION_CONTRACT_VERSION) {
    return NextResponse.json({ error: 'Unsupported contract version' }, { status: 400 })
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }
  storeProvisionedUser(plexonUserId.trim(), {
    email: body.email.trim().toLowerCase(),
    name: body.name ?? null,
    desiredState: body.desiredState ?? 'granted',
  })
  return jsonWithContract({ status: 'applied', userId: plexonUserId.trim() })
}
