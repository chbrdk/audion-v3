import { NextResponse } from 'next/server'
import type { BehavioralGoldObservation, BehavioralSurface } from '@audion-v3/contracts'
import { BEHAVIORAL_SCHEMA_VERSION } from '@audion-v3/contracts'
import { auth } from '../../../../auth'
import {
  getBehavioralPolicyScoreboard,
  listBehavioralGoldObservations,
  listBehavioralPolicyScoreboards,
  recordBehavioralGoldObservation,
} from '../../../../lib/behavior/gold-store'
import { paths } from '../../../../lib/paths'

export const runtime = 'nodejs'

const SURFACES: BehavioralSurface[] = ['browse', 'chat', 'video']

export async function GET(request: Request) {
  const url = new URL(request.url)
  const policyId = url.searchParams.get('policyId')?.trim() || null
  if (policyId) {
    return NextResponse.json({
      scoreboard: getBehavioralPolicyScoreboard(policyId),
      observations: listBehavioralGoldObservations(policyId),
    })
  }
  return NextResponse.json({ scoreboards: listBehavioralPolicyScoreboards() })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const policyId = typeof body.policyId === 'string' ? body.policyId.trim() : ''
  const personaId = typeof body.personaId === 'string' ? body.personaId.trim() : ''
  const surface = SURFACES.includes(body.surface as BehavioralSurface)
    ? (body.surface as BehavioralSurface)
    : null
  const metrics =
    body.metrics && typeof body.metrics === 'object'
      ? (body.metrics as BehavioralGoldObservation['metrics'])
      : null
  if (!policyId || !personaId || !surface || !metrics) {
    return NextResponse.json(
      { error: 'policyId, personaId, surface, and metrics are required' },
      { status: 400 },
    )
  }

  const label = body.label === 'human_gold' ? 'human_gold' : 'synthetic'
  const observation = recordBehavioralGoldObservation({
    id:
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim()
        : `bg-post-${Date.now().toString(36)}`,
    policyId,
    schemaVersion:
      typeof body.schemaVersion === 'string' && body.schemaVersion.trim()
        ? body.schemaVersion.trim()
        : BEHAVIORAL_SCHEMA_VERSION,
    surface,
    personaId,
    conversationId:
      typeof body.conversationId === 'string' ? body.conversationId : null,
    recordedAt:
      typeof body.recordedAt === 'string' && body.recordedAt.trim()
        ? body.recordedAt
        : new Date().toISOString(),
    label,
    metrics,
  })

  return NextResponse.json(
    { observation, path: paths.routes.apiBehavioralScoreboard },
    { status: 201 },
  )
}
