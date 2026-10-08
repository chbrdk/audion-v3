export type TargetGroupStatus = 'active' | 'archived' | 'draft'

export type TargetGroupSummary = {
  id: string
  /** Magazine URL key — updates when name changes. Spec: entity-url-slugs.md */
  slug: string
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
  slug?: string | null
  name: string
  role: string
  status: string
  avatarUrl: string | null
}

export type TargetGroupDetail = TargetGroupSummary & {
  linkedPersonas: TargetGroupLinkedPersona[]
  /** Magazine knowledge cards (V2 `/target-groups/{id}/knowledge`). */
  knowledgeEntries: import('./knowledge-entries').KnowledgeEntry[]
  /** Uploaded sources (V2 `/target-groups/{id}/documents`) — list metadata. */
  documents: import('./knowledge-entries').DocumentSource[]
  /**
   * Optional soft bias for linked personas / segment chat.
   * Spec: behavioral-controller.md · target-group-fields.md
   */
  behavioralPriors?: import('./behavioral-policy').TargetGroupBehavioralPriors | null
}

/** Create / PATCH body */
export type TargetGroupWritePayload = {
  name: string
  segment: string
  description?: string | null
  status?: TargetGroupStatus
  projectId?: string | null
  linkedPersonaIds?: string[]
  knowledgeEntries?: import('./knowledge-entries').KnowledgeEntry[]
  documents?: import('./knowledge-entries').DocumentSource[]
  behavioralPriors?: import('./behavioral-policy').TargetGroupBehavioralPriors | null
}
