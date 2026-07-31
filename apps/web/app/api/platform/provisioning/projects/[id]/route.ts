import { NextResponse } from 'next/server'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  isProvisioningAuthorized,
} from '../../../../../../lib/plexon-contract'
import { getPlexonServiceSecret } from '../../../../../../lib/runtime-config'
import {
  storeGetByPlatformProjectId,
  storeUpsertByPlatformProjectId,
} from '../../../../../../lib/fixtures/project-store'

function jsonWithContract(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set(PLEXON_CONTRACT_VERSION_HEADER, PLEXON_FEDERATION_CONTRACT_VERSION)
  return NextResponse.json(body, { ...init, headers })
}

/** Dashboard BFF: persona summary for a mirrored platform project. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const plexonUserId = request.headers.get('X-Plexon-User-Id')?.trim()
  if (!plexonUserId) {
    return NextResponse.json({ error: 'X-Plexon-User-Id required' }, { status: 400 })
  }
  const { id: platformProjectId } = await context.params
  if (!platformProjectId?.trim()) {
    return NextResponse.json({ error: 'platform project id required' }, { status: 400 })
  }
  const project = await storeGetByPlatformProjectId(platformProjectId.trim())
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return jsonWithContract({
    externalProjectId: project.id,
    personaCount: project.personaCount ?? 0,
    platformProjectId: platformProjectId.trim(),
  })
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
  const project = await storeUpsertByPlatformProjectId(platformProjectId.trim(), {
    name: body.name.trim(),
    platformCompanyId: body.platformCompanyId.trim(),
    ownerUserId: body.ownerUserId.trim(),
    status: body.status === 'archived' ? 'archived' : 'active',
  })
  return jsonWithContract({
    status: 'applied',
    /** Federation contract field consumed by PLEXON binding sync. */
    externalProjectId: project.id,
    projectId: project.id,
    platformProjectId: platformProjectId.trim(),
  })
}
