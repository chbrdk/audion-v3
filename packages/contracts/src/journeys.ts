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

/** Convert UX Journey Agent / Study wave run → Customer Journey (V2 `/journeys/from-ux-run`). */
export type JourneyFromUxRunRequest = {
  jobId?: string | null
  personaId?: string | null
  /** Fixture/study context — used when not proxying live */
  studyId?: string | null
  waveId?: string | null
  runKey?: string | null
  /** Chat inspect_website convert (no study wave required in fixtures). */
  source?: 'study_wave' | 'chat_inspect' | null
  url?: string | null
  task?: string | null
  mode?: 'ai' | 'deterministic'
  journeyName?: string | null
  journeyType?: string | null
  targetGroupId?: string | null
  projectId?: string | null
  organizationId?: string | null
  locale?: string | null
}

export type JourneyFromUxRunResponse = {
  stubbed: boolean
  journey: {
    id: string
    name: string
    phaseCount: number
  }
  mode: 'ai' | 'deterministic'
  fallbackUsed: boolean
  alreadyConverted: boolean
  target: { method: 'POST'; path: string; body: Record<string, unknown> }
}
