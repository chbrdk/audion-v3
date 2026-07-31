/**
 * Client-safe AI workflow target metadata (no server/DB imports).
 */
import type { AiWorkflowId } from '@audion-v3/contracts'

export type AiWorkflowTargetDef = {
  id: AiWorkflowId
  /** Human label for UI title / Hint */
  label: string
  /** Upstream path template; `{id}` placeholders filled at call time */
  upstreamPath: string
  method: 'POST'
  v2Source: string
}

export const AI_WORKFLOW_TARGETS: Record<AiWorkflowId, AiWorkflowTargetDef> = {
  generatePersonas: {
    id: 'generatePersonas',
    label: 'Generate personas',
    /** V2 FastAPI (persona-api) — no /api prefix */
    upstreamPath: '/target-groups/{tgId}/personas/generate',
    method: 'POST',
    v2Source: 'msqdx-glass-target-group-personas-panel / personas overview',
  },
  generatePersonaAvatar: {
    id: 'generatePersonaAvatar',
    label: 'Generate avatar',
    /** V2 chat-api portrait generate */
    upstreamPath: '/personas/{personaId}/generate-image',
    method: 'POST',
    v2Source: 'chat-api · generate-image (V2 Next proxies via persona-admin)',
  },
  suggestPersonaField: {
    id: 'suggestPersonaField',
    label: 'Suggest field',
    upstreamPath: '/personas/{personaId}/ai/{fieldKey}',
    method: 'POST',
    v2Source: 'msqdx-glass-chip-editor / persona enrich · ai-assist templates',
  },
  enrichPersona: {
    id: 'enrichPersona',
    label: 'Enrich persona',
    upstreamPath: '/personas/{personaId}/enrich',
    method: 'POST',
    v2Source: 'persona admin Enrich — AiAssist facet batch',
  },
  generateMoodboard: {
    id: 'generateMoodboard',
    label: 'Generate moodboard',
    upstreamPath: '/api/persona-admin/{personaId}/moodboards',
    method: 'POST',
    v2Source: 'persona-admin moodboards + Celery moodboard.build',
  },
  suggestTargetGroups: {
    id: 'suggestTargetGroups',
    label: 'Suggest target groups',
    upstreamPath: '/projects/{projectId}/suggest-target-groups',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel / target-groups overview',
  },
  suggestPersonas: {
    id: 'suggestPersonas',
    label: 'Suggest personas',
    upstreamPath: '/target-groups/{tgId}/suggest-personas',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel',
  },
  researchStart: {
    id: 'researchStart',
    label: 'Start research',
    upstreamPath: '/projects/{projectId}/research/start',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel',
  },
  generateJourney: {
    id: 'generateJourney',
    label: 'Generate journey',
    upstreamPath: '/journeys/generate',
    method: 'POST',
    v2Source: 'admin/journeys/new',
  },
  generateJourneyFromProject: {
    id: 'generateJourneyFromProject',
    label: 'Generate journey',
    upstreamPath: '/projects/{projectId}/generate-journey',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel',
  },
  generateJourneyPhaseMoments: {
    id: 'generateJourneyPhaseMoments',
    label: 'Generate phase moments',
    upstreamPath: '/journeys/{journeyId}/ai/generate',
    method: 'POST',
    v2Source: 'journey editor · journey.moments template',
  },
  validateJourney: {
    id: 'validateJourney',
    label: 'Validate journey',
    upstreamPath: '/journeys/{journeyId}/validate',
    method: 'POST',
    v2Source: 'JourneyValidationService — rule-based fit vs persona',
  },
}

export function formatUpstreamPath(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? `{${key}}`)
}

export function targetHint(workflowId: AiWorkflowId): string {
  const def = AI_WORKFLOW_TARGETS[workflowId]
  return `${def.method} ${def.upstreamPath}`
}
