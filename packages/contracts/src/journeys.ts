export type JourneyStatus = 'draft' | 'active' | 'archived'

export type JourneyElementKind =
  | 'action'
  | 'thought'
  | 'feeling'
  | 'pain'
  | 'opportunity'
  | 'other'

export type JourneySummary = {
  id: string
  name: string
  journeyType: string
  status: JourneyStatus
  phaseCount: number
  targetGroupId: string | null
  targetGroupName: string | null
  projectId: string | null
  updatedAt: string | null
}

export type JourneyList = {
  items: JourneySummary[]
  total: number
  page: number
  pageSize: number
}

export type JourneyPhaseElement = {
  id: string
  kind: JourneyElementKind
  label: string
  order: number
}

export type JourneyPhase = {
  id: string
  name: string
  order: number
  summary: string | null
  elements: JourneyPhaseElement[]
}

export type JourneyDetail = JourneySummary & {
  description: string | null
  phases: JourneyPhase[]
}

/** Create / PATCH body — journey MVP */
export type JourneyWritePayload = {
  name: string
  journeyType: string
  status?: JourneyStatus
  description?: string | null
  targetGroupId?: string | null
  projectId?: string | null
  phases?: JourneyPhase[]
}
