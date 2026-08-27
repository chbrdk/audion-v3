/**
 * Journey persistence facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 */
import type { JourneyDetail, JourneyList, JourneyPhase, JourneyWritePayload } from '@audion-v3/contracts'
import { isProjectsDatabaseConfigured } from '../db/config'
import { DEMO_JOURNEYS } from './journeys'
import { storeTargetGroupDetail } from './target-group-store'

async function dbApi() {
  return import('../db/journeys')
}

/** Empty until create or `resetJourneyStore()` (tests). No DEMO product seed. */
let journeys: JourneyDetail[] = []

export function resetJourneyStore(): void {
  journeys = DEMO_JOURNEYS.map((j) => structuredClone(j))
}

function sortPhases(phases: JourneyPhase[]): JourneyPhase[] {
  return [...phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => ({
      ...phase,
      elements: [...phase.elements].sort((a, b) => a.order - b.order),
    }))
}

async function withCounts(journey: JourneyDetail): Promise<JourneyDetail> {
  const phases = sortPhases(journey.phases)
  let targetGroupName = journey.targetGroupName
  if (journey.targetGroupId) {
    const tg = await storeTargetGroupDetail(journey.targetGroupId)
    targetGroupName = tg?.name ?? journey.targetGroupName
  }
  return {
    ...journey,
    phases,
    phaseCount: phases.length,
    targetGroupName,
  }
}

async function memoryJourneyList(): Promise<JourneyList> {
  const items = await Promise.all(
    journeys.map(async (j) => {
      const detail = await withCounts(j)
      const { description: _d, phases: _p, ...summary } = detail
      return summary
    }),
  )
  return { items, total: items.length, page: 1, pageSize: 50 }
}

async function memoryJourneyDetail(id: string): Promise<JourneyDetail | null> {
  const found = journeys.find((j) => j.id === id)
  return found ? await withCounts(found) : null
}

async function memoryCreateJourney(payload: JourneyWritePayload): Promise<JourneyDetail> {
  const id = `journey-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const phases = sortPhases(payload.phases ?? [])
  let targetGroupName: string | null = null
  if (payload.targetGroupId) {
    targetGroupName = (await storeTargetGroupDetail(payload.targetGroupId))?.name ?? null
  }
  const created = await withCounts({
    id,
    name: payload.name.trim(),
    journeyType: payload.journeyType.trim() || 'journey',
    status: payload.status ?? 'draft',
    phaseCount: phases.length,
    targetGroupId: payload.targetGroupId ?? null,
    targetGroupName,
    projectId: payload.projectId ?? null,
    updatedAt: new Date().toISOString(),
    description: payload.description ?? null,
    phases,
  })
  journeys = [created, ...journeys]
  return created
}

async function memoryPatchJourney(
  id: string,
  payload: Partial<JourneyWritePayload>,
): Promise<JourneyDetail | null> {
  const index = journeys.findIndex((j) => j.id === id)
  if (index < 0) return null
  const current = journeys[index]!
  const phases =
    payload.phases !== undefined ? sortPhases(payload.phases) : sortPhases(current.phases)
  const targetGroupId =
    payload.targetGroupId !== undefined ? payload.targetGroupId : current.targetGroupId
  let targetGroupName = current.targetGroupName
  if (payload.targetGroupId !== undefined) {
    targetGroupName = targetGroupId
      ? (await storeTargetGroupDetail(targetGroupId))?.name ?? null
      : null
  }
  const next = await withCounts({
    ...current,
    name: payload.name?.trim() ?? current.name,
    journeyType: payload.journeyType?.trim() ?? current.journeyType,
    status: payload.status ?? current.status,
    description: payload.description !== undefined ? payload.description : current.description,
    targetGroupId,
    targetGroupName,
    projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
    phases,
    updatedAt: new Date().toISOString(),
  })
  journeys = [...journeys.slice(0, index), next, ...journeys.slice(index + 1)]
  return next
}

function memoryDeleteJourney(id: string): boolean {
  const index = journeys.findIndex((j) => j.id === id)
  if (index < 0) return false
  journeys = [...journeys.slice(0, index), ...journeys.slice(index + 1)]
  return true
}

export async function storeJourneyList(): Promise<JourneyList> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbJourneyList()
  }
  return memoryJourneyList()
}

export async function storeJourneyDetail(id: string): Promise<JourneyDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbJourneyDetail(id)
  }
  return memoryJourneyDetail(id)
}

export async function storeCreateJourney(payload: JourneyWritePayload): Promise<JourneyDetail> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCreateJourney(payload)
  }
  return memoryCreateJourney(payload)
}

export async function storePatchJourney(
  id: string,
  payload: Partial<JourneyWritePayload>,
): Promise<JourneyDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchJourney(id, payload)
  }
  return memoryPatchJourney(id, payload)
}

export async function storeDeleteJourney(id: string): Promise<boolean> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeleteJourney(id)
  }
  return memoryDeleteJourney(id)
}
