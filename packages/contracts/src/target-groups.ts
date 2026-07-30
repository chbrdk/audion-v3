export type TargetGroupStatus = 'active' | 'archived' | 'draft'

export type TargetGroupSummary = {
  id: string
  name: string
  segment: string
  description: string | null
  status: TargetGroupStatus
  personaCount: number
  projectId: string | null
  updatedAt: string | null
}

export type TargetGroupList = {
  items: TargetGroupSummary[]
  total: number
  page: number
  pageSize: number
}

export type TargetGroupLinkedPersona = {
  id: string
  name: string
  role: string
  status: string
  avatarUrl: string | null
}

export type TargetGroupDetail = TargetGroupSummary & {
  linkedPersonas: TargetGroupLinkedPersona[]
}

/** Create / PATCH body */
export type TargetGroupWritePayload = {
  name: string
  segment: string
  description?: string | null
  status?: TargetGroupStatus
  projectId?: string | null
  linkedPersonaIds?: string[]
}
