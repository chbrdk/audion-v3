import type { JourneyDetail, JourneyList, JourneyPhase, JourneyWritePayload } from '@audion-v3/contracts'
import { DEMO_JOURNEYS } from './journeys'
import { storeTargetGroupDetail } from './target-group-store'

let journeys: JourneyDetail[] = DEMO_JOURNEYS.map((j) => structuredClone(j))

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

function withCounts(journey: JourneyDetail): JourneyDetail {
  const phases = sortPhases(journey.phases)
  let targetGroupName = journey.targetGroupName
  if (journey.targetGroupId) {
    const tg = storeTargetGroupDetail(journey.targetGroupId)
    targetGroupName = tg?.name ?? journey.targetGroupName
  }
  return {
    ...journey,
    phases,
    phaseCount: phases.length,
    targetGroupName,
  }
}

export function storeJourneyList(): JourneyList {
  const items = journeys.map((j) => {
    const detail = withCounts(j)
    const { description: _d, phases: _p, ...summary } = detail
    return summary
  })
  return { items, total: items.length, page: 1, pageSize: 50 }
}

export function storeJourneyDetail(id: string): JourneyDetail | null {
  const found = journeys.find((j) => j.id === id)
  return found ? withCounts(found) : null
}

export function storeCreateJourney(payload: JourneyWritePayload): JourneyDetail {
  const id = `journey-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const phases = sortPhases(payload.phases ?? [])
  let targetGroupName: string | null = null
  if (payload.targetGroupId) {
    targetGroupName = storeTargetGroupDetail(payload.targetGroupId)?.name ?? null
  }
  const created = withCounts({
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

export function storePatchJourney(
  id: string,
  payload: Partial<JourneyWritePayload>,
): JourneyDetail | null {
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
      ? storeTargetGroupDetail(targetGroupId)?.name ?? null
      : null
  }
  const next = withCounts({
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

export function storeDeleteJourney(id: string): boolean {
  const index = journeys.findIndex((j) => j.id === id)
  if (index < 0) return false
  journeys = [...journeys.slice(0, index), ...journeys.slice(index + 1)]
  return true
}
