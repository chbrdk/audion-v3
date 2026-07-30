import type { PersonaDetail } from './personas'
import type { ProjectDetail } from './projects'
import type { TargetGroupDetail } from './target-groups'

/** POST /api/projects/bootstrap body (V2 Easy Setup fields). */
export type ProjectEasySetupRequest = {
  customer_name: string
  about: string
  website_url?: string | null
  project_name?: string | null
  output_locale?: string | null
}

/** Created entity summaries returned to the magazine success UI. */
export type ProjectEasySetupEntityRef = {
  id: string
  name: string
}

export type ProjectEasySetupTargetGroupRef = ProjectEasySetupEntityRef & {
  segment: string
}

export type ProjectEasySetupPersonaRef = ProjectEasySetupEntityRef & {
  role: string
}

/** POST /api/projects/bootstrap response. */
export type ProjectEasySetupResponse = {
  stubbed: boolean
  project: ProjectDetail
  targetGroup: TargetGroupDetail
  persona: PersonaDetail
  websiteExcerptIncluded: boolean
}
