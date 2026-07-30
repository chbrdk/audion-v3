import { NextResponse } from 'next/server'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  isProvisioningAuthorized,
} from '../../../../../../lib/plexon-contract'
import { getPlexonServiceSecret } from '../../../../../../lib/runtime-config'
import { storeUpsertByPlatformProjectId } from '../../../../../../lib/fixtures/project-store'

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
  const { id: platformProjectId } = await context.params
  if (!platformProjectId?.trim()) {
    return NextResponse.json({ error: 'platform project id required' }, { status: 400 })
  }
  let body: {
    platformCompanyId?: string
    name?: string
    status?: 'active' | 'archived'
    ownerUserId?: string
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
  if (!body.name?.trim() || !body.platformCompanyId?.trim() || !body.ownerUserId?.trim()) {
    return NextResponse.json({ error: 'name, platformCompanyId, ownerUserId required' }, { status: 400 })
  }
  const project = storeUpsertByPlatformProjectId(platformProjectId.trim(), {
    name: body.name.trim(),
    platformCompanyId: body.platformCompanyId.trim(),
    ownerUserId: body.ownerUserId.trim(),
    status: body.status === 'archived' ? 'archived' : 'active',
  })
  return jsonWithContract({
    status: 'applied',
    projectId: project.id,
    platformProjectId: platformProjectId.trim(),
  })
}
