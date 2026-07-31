import { desc, eq, sql } from 'drizzle-orm'
import type {
  JourneyDetail,
  JourneyList,
  JourneyPhase,
  JourneyStatus,
  JourneyWritePayload,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { journeys, type JourneyRow } from './schema'
import { dbTargetGroupDetail } from './target-groups'

function normalizeStatus(value: string | null | undefined): JourneyStatus {
  if (value === 'archived' || value === 'active' || value === 'draft') return value
  return 'draft'
}

function sortPhases(phases: JourneyPhase[]): JourneyPhase[] {
  return [...phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => ({
      ...phase,
      elements: [...phase.elements].sort((a, b) => a.order - b.order),
    }))
}

async function resolveTargetGroupName(
  targetGroupId: string | null | undefined,
  fallback: string | null,
): Promise<string | null> {
  if (!targetGroupId) return null
  const tg = await dbTargetGroupDetail(targetGroupId)
  return tg?.name ?? fallback
}

function rowToDetail(
  row: JourneyRow,
  targetGroupName: string | null,
): JourneyDetail {
  const phases = sortPhases(Array.isArray(row.phases) ? row.phases : [])
  return {
    id: row.id,
    name: row.name,
    journeyType: row.journeyType,
    status: normalizeStatus(row.status),
    phaseCount: phases.length,
    targetGroupId: row.targetGroupId ?? null,
    targetGroupName,
    projectId: row.projectId ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    description: row.description ?? null,
    phases,
  }
}

async function withResolved(row: JourneyRow): Promise<JourneyDetail> {
  const targetGroupName = await resolveTargetGroupName(
    row.targetGroupId,
    row.targetGroupName ?? null,
  )
  return rowToDetail(row, targetGroupName)
}

function toSummary(detail: JourneyDetail) {
  const { description: _d, phases: _p, ...summary } = detail
  return summary
}

export async function dbJourneyList(): Promise<JourneyList> {
  const db = getDb()
  const rows = await db.select().from(journeys).orderBy(desc(journeys.updatedAt))
  const items = await Promise.all(rows.map(async (row) => toSummary(await withResolved(row))))
  return { items, total: items.length, page: 1, pageSize: Math.max(50, items.length) }
}

export async function dbJourneyDetail(id: string): Promise<JourneyDetail | null> {
  const db = getDb()
  const rows = await db.select().from(journeys).where(eq(journeys.id, id)).limit(1)
  const row = rows[0]
  return row ? withResolved(row) : null
}

export async function dbCountJourneysByProjectId(projectId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(journeys)
    .where(eq(journeys.projectId, projectId))
  return Number(rows[0]?.n ?? 0)
}

export async function dbCreateJourney(payload: JourneyWritePayload): Promise<JourneyDetail> {
  const id = `journey-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const phases = sortPhases(payload.phases ?? [])
  const targetGroupId = payload.targetGroupId ?? null
  const targetGroupName = await resolveTargetGroupName(targetGroupId, null)
  const now = new Date()
  const db = getDb()
  await db.insert(journeys).values({
    id,
    name: payload.name.trim(),
    journeyType: payload.journeyType.trim() || 'journey',
    status: payload.status ?? 'draft',
    phaseCount: phases.length,
    targetGroupId,
    targetGroupName,
    projectId: payload.projectId ?? null,
    description: payload.description ?? null,
    phases,
    updatedAt: now,
    createdAt: now,
  })
  const created = await dbJourneyDetail(id)
  if (!created) throw new Error('Failed to create journey')
  return created
}

export async function dbPatchJourney(
  id: string,
  payload: Partial<JourneyWritePayload>,
): Promise<JourneyDetail | null> {
  const current = await dbJourneyDetail(id)
  if (!current) return null
  const phases =
    payload.phases !== undefined ? sortPhases(payload.phases) : sortPhases(current.phases)
  const targetGroupId =
    payload.targetGroupId !== undefined ? payload.targetGroupId : current.targetGroupId
  let targetGroupName = current.targetGroupName
  if (payload.targetGroupId !== undefined) {
    targetGroupName = await resolveTargetGroupName(targetGroupId, null)
  }
  const db = getDb()
  await db
    .update(journeys)
    .set({
      name: payload.name?.trim() ?? current.name,
      journeyType: payload.journeyType?.trim() ?? current.journeyType,
      status: payload.status ?? current.status,
      description: payload.description !== undefined ? payload.description : current.description,
      targetGroupId,
      targetGroupName,
      projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
      phases,
      phaseCount: phases.length,
      updatedAt: new Date(),
    })
    .where(eq(journeys.id, id))
  return dbJourneyDetail(id)
}

export async function dbDeleteJourney(id: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db.delete(journeys).where(eq(journeys.id, id)).returning({ id: journeys.id })
  return deleted.length > 0
}
