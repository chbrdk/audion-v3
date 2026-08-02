export type ProjectStatus = 'draft' | 'published' | 'archived'

export type ProjectMember = {
  id: string
  email: string
  role: string
  status: 'active' | 'invited' | 'removed'
}

/** Named knowledge chapter for the project dossier accordion. */
export type ProjectKnowledgeChapter = {
  id: string
  title: string
  body: string
}

export type ProjectSummary = {
  id: string
  name: string
  nameDe: string | null
  description: string | null
  /** Flattened knowledge preview / search (derived from chapters when present). */
  companyContext: string | null
  status: ProjectStatus
  personaCount: number
  targetGroupCount: number
  memberCount: number
  updatedAt: string | null
}

export type ProjectList = {
  items: ProjectSummary[]
  total: number
  page: number
  pageSize: number
}

export type ProjectDetail = ProjectSummary & {
  members: ProjectMember[]
  /** Accordion chapters for project knowledge. Empty → fall back to companyContext as one Brief. */
  knowledgeChapters: ProjectKnowledgeChapter[]
  /** Plexon platform project id when federated (Wave 1). */
  platformProjectId?: string | null
  /** CHECKION binding external_project_id from Collection (single-scan deep-link). */
  checkionProjectId?: string | null
  platformCompanyId?: string | null
  ownerPlexonUserId?: string | null
}

/** Create / PATCH body */
export type ProjectWritePayload = {
  name: string
  nameDe?: string | null
  description?: string | null
  companyContext?: string | null
  knowledgeChapters?: ProjectKnowledgeChapter[]
  status?: ProjectStatus
  /** Full members replacement when provided (detail edit) */
  members?: ProjectMember[]
  platformProjectId?: string | null
  checkionProjectId?: string | null
  platformCompanyId?: string | null
  ownerPlexonUserId?: string | null
}

/** Options for fixture create (session / federation). */
export type ProjectCreateOptions = {
  ownerEmail?: string
  ownerPlexonUserId?: string | null
  platformCompanyId?: string | null
}
