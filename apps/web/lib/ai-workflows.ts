/**
 * AI workflow registry — single source of truth for V2 target calls.
 * Wave 1 stubs fixtures; Wave 2 proxies via getPersonaBackendBase().
 * Spec twin: knowledge/ai-workflows.md
 */

import type {
  AiStubMeta,
  AiSuggestionItem,
  AiTargetCall,
  AiWorkflowId,
  GenerateJourneyRequest,
  GenerateJourneyResponse,
  GeneratePersonaAvatarRequest,
  GeneratePersonaAvatarResponse,
  GeneratePersonasRequest,
  GeneratePersonasResponse,
  PersonaSuggestField,
  ResearchStartRequest,
  ResearchStartResponse,
  SuggestPersonaFieldRequest,
  SuggestPersonaFieldResponse,
  SuggestPersonasRequest,
  SuggestPersonasResponse,
  SuggestTargetGroupsRequest,
  SuggestTargetGroupsResponse,
} from '@audion-v3/contracts'
import { storeCreateJourney } from './fixtures/journey-store'
import { storeCreatePersona, storePatchPersona, storePersonaDetail } from './fixtures/persona-store'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from './fixtures/target-group-store'
import { storeProjectDetail } from './fixtures/project-store'
import { personaAvatarPath } from './paths'

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
    upstreamPath: '/api/target-groups/{tgId}/personas/generate',
    method: 'POST',
    v2Source: 'msqdx-glass-target-group-personas-panel / personas overview',
  },
  generatePersonaAvatar: {
    id: 'generatePersonaAvatar',
    label: 'Generate avatar',
    upstreamPath: '/api/persona-admin/{personaId}/generate-image',
    method: 'POST',
    v2Source: 'msqdx-glass-persona-admin-panel · knowledge/avatar-generation.md (AUDION-v2)',
  },
  suggestPersonaField: {
    id: 'suggestPersonaField',
    label: 'Suggest field',
    upstreamPath: '/api/personas/{personaId}/ai/{fieldKey}',
    method: 'POST',
    v2Source: 'msqdx-glass-chip-editor / persona enrich · ai-assist templates',
  },
  suggestTargetGroups: {
    id: 'suggestTargetGroups',
    label: 'Suggest target groups',
    upstreamPath: '/api/projects/{projectId}/suggest-target-groups',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel / target-groups overview',
  },
  suggestPersonas: {
    id: 'suggestPersonas',
    label: 'Suggest personas',
    upstreamPath: '/api/target-groups/{tgId}/suggest-personas',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel',
  },
  researchStart: {
    id: 'researchStart',
    label: 'Start research',
    upstreamPath: '/api/projects/{projectId}/research/start',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel',
  },
  generateJourney: {
    id: 'generateJourney',
    label: 'Generate journey',
    upstreamPath: '/api/journeys/generate',
    method: 'POST',
    v2Source: 'admin/journeys/new',
  },
  generateJourneyFromProject: {
    id: 'generateJourneyFromProject',
    label: 'Generate journey',
    upstreamPath: '/api/projects/{projectId}/generate-journey',
    method: 'POST',
    v2Source: 'msqdx-glass-project-admin-panel',
  },
}

export function formatUpstreamPath(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? `{${key}}`)
}

export function buildTargetCall(
  workflowId: AiWorkflowId,
  pathParams: Record<string, string>,
  body: Record<string, unknown>,
): AiTargetCall {
  const def = AI_WORKFLOW_TARGETS[workflowId]
  return {
    method: def.method,
    path: formatUpstreamPath(def.upstreamPath, pathParams),
    body,
  }
}

export function stubMeta(
  workflowId: AiWorkflowId,
  pathParams: Record<string, string>,
  body: Record<string, unknown>,
): AiStubMeta {
  const target = buildTargetCall(workflowId, pathParams, body)
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[ai-stub] ${workflowId} → ${target.method} ${target.path}`, target.body)
  }
  return { stubbed: true, workflowId, target }
}

const STUB_PERSONA_NAMES = [
  { name: 'Alex Rivera', role: 'Research lead' },
  { name: 'Jordan Lee', role: 'Brand strategist' },
  { name: 'Sam Okonkwo', role: 'Product marketer' },
]

const STUB_AVATAR_SLUGS = [
  'persona-alex-morgan',
  'persona-samira-khan',
  'persona-jonas-richter',
  'persona-lena-vogel',
  'persona-marco-bianchi',
] as const

function nextStubAvatarUrl(current: string | null): string {
  const pool = STUB_AVATAR_SLUGS.map((slug) => personaAvatarPath(slug))
  const idx = current ? pool.findIndex((url) => current === url || current.startsWith(`${url}?`)) : -1
  return pool[(idx + 1) % pool.length]!
}

export function runStubGeneratePersonaAvatar(
  personaId: string,
  body: GeneratePersonaAvatarRequest = {},
): GeneratePersonaAvatarResponse | { error: string; status: number } {
  const persona = storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const upstreamBody = {
    style: body.style?.trim() || undefined,
  }
  const meta = stubMeta('generatePersonaAvatar', { personaId }, upstreamBody)
  const avatarUrl = nextStubAvatarUrl(persona.avatarUrl)
  const patched = storePatchPersona(personaId, { avatarUrl })
  if (!patched) return { error: 'Persona not found', status: 404 }

  return { ...meta, avatarUrl: patched.avatarUrl! }
}

const FIELD_UPSTREAM: Record<
  PersonaSuggestField,
  { fieldKey: string; path: string; templateId?: string }
> = {
  interests: {
    fieldKey: 'interests',
    path: '/api/personas/{personaId}/ai/interests',
  },
  values: {
    fieldKey: 'values',
    path: '/api/personas/{personaId}/ai/values',
  },
  goals: {
    fieldKey: 'goals',
    path: '/api/personas/{personaId}/ai/goals',
  },
  frustrations: {
    fieldKey: 'pain-points',
    path: '/api/personas/{personaId}/ai/pain-points',
  },
  traits: {
    fieldKey: 'traits',
    path: '/api/ai-assist',
    templateId: 'persona.traits',
  },
  vocabulary: {
    fieldKey: 'vocabulary',
    path: '/api/ai-assist',
    templateId: 'persona.vocabulary',
  },
  sentenceStructure: {
    fieldKey: 'sentence_structure',
    path: '/api/ai-assist',
    templateId: 'persona.sentence_structure',
  },
}

const STUB_FIELD_SEEDS: Record<PersonaSuggestField, string[]> = {
  interests: ['Evidence synthesis', 'Workshop facilitation', 'Competitive scans', 'Narrative design'],
  values: ['Transparency', 'Craft', 'Shared ownership', 'Pace with care'],
  goals: [
    'Ship decisions with a clear evidence trail',
    'Cut handoff friction between research and delivery',
    'Keep the persona brief living after workshops',
  ],
  frustrations: [
    'Slide decks that replace decisions',
    'Stale personas nobody updates',
    'Unclear ownership of audience truth',
  ],
  traits: ['Curious', 'Decisive', 'Systems thinker', 'Empathetic'],
  vocabulary: ['signal', 'trade-off', 'north star', 'evidence pack'],
  sentenceStructure: [
    'Lead with the decision, then the evidence in one breath.',
    'Short clauses. Concrete nouns. No filler.',
  ],
}

export function runStubSuggestPersonaField(
  personaId: string,
  body: SuggestPersonaFieldRequest,
): SuggestPersonaFieldResponse | { error: string; status: number } {
  const persona = storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const field = body.field
  if (!field || !(field in FIELD_UPSTREAM)) {
    return { error: 'Unknown suggest field', status: 400 }
  }

  const max = Math.min(Math.max(body.max_suggestions ?? 3, 1), 6)
  const upstream = FIELD_UPSTREAM[field]
  const upstreamBody: Record<string, unknown> = {
    max_suggestions: max,
    output_locale: body.output_locale ?? 'en',
  }
  if (upstream.templateId) {
    upstreamBody.template_id = upstream.templateId
    upstreamBody.persona_id = personaId
  }

  const target: AiTargetCall = {
    method: 'POST',
    path: formatUpstreamPath(upstream.path, { personaId }),
    body: upstreamBody,
  }
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[ai-stub] suggestPersonaField:${field} → ${target.method} ${target.path}`, target.body)
  }

  const seeds = STUB_FIELD_SEEDS[field]
  const existing =
    field === 'interests'
      ? persona.interests
      : field === 'values'
        ? persona.values
        : field === 'goals'
          ? persona.goals.map((g) => g.label)
          : field === 'frustrations'
            ? persona.frustrations.map((f) => f.label)
            : field === 'traits'
              ? Object.keys(persona.traits)
              : field === 'vocabulary'
                ? persona.communicationStyle?.vocabulary ?? []
                : persona.communicationStyle?.sentenceStructure
                  ? [persona.communicationStyle.sentenceStructure]
                  : []

  const existingKeys = new Set(existing.map((s) => s.trim().toLowerCase()).filter(Boolean))
  const fresh = seeds.filter((s) => !existingKeys.has(s.toLowerCase()))
  const pool = fresh.length ? fresh : seeds
  const suggestions: AiSuggestionItem[] = pool.slice(0, max).map((title, i) => ({
    id: `sug-${field}-${personaId}-${i + 1}`,
    title,
    subtitle: persona.name,
    description: `Stub suggestion for ${field} · ${persona.role}`,
  }))

  return {
    stubbed: true,
    workflowId: 'suggestPersonaField',
    target,
    field,
    suggestions,
  }
}

export function runStubGeneratePersonas(
  tgId: string,
  body: GeneratePersonasRequest,
): GeneratePersonasResponse | { error: string; status: number } {
  const tg = storeTargetGroupDetail(tgId)
  if (!tg) return { error: 'Target group not found', status: 404 }

  const count = Math.min(Math.max(body.count ?? 2, 1), 5)
  const segment = body.segment?.trim() || tg.segment
  const description = body.description ?? tg.description
  const upstreamBody = {
    segment,
    description: description ?? undefined,
    filter_mode: body.filter_mode ?? 'auto',
  }
  const meta = stubMeta('generatePersonas', { tgId }, upstreamBody)

  const created = STUB_PERSONA_NAMES.slice(0, count).map((seed, i) =>
    storeCreatePersona({
      name: `${seed.name} (${segment})`,
      role: seed.role,
      status: 'draft',
      archetype: segment,
      bio: `Stub persona from AI generate — will call ${meta.target.path}`,
      projectId: tg.projectId,
      interests: [segment],
    }),
  )

  const linkedIds = [...tg.linkedPersonas.map((p) => p.id), ...created.map((p) => p.id)]
  storePatchTargetGroup(tgId, { linkedPersonaIds: linkedIds })

  return {
    ...meta,
    personas: created.map((p) => ({ id: p.id, name: p.name, role: p.role })),
  }
}

export function runStubSuggestTargetGroups(
  projectId: string,
  body: SuggestTargetGroupsRequest,
): SuggestTargetGroupsResponse | { error: string; status: number } {
  const project = storeProjectDetail(projectId)
  if (!project) return { error: 'Project not found', status: 404 }

  const max = Math.min(Math.max(body.max_suggestions ?? 5, 1), 8)
  const upstreamBody = {
    max_suggestions: max,
    output_locale: body.output_locale ?? 'en',
    bilingual: body.bilingual ?? false,
  }
  const meta = stubMeta('suggestTargetGroups', { projectId }, upstreamBody)

  const seeds: AiSuggestionItem[] = [
    {
      id: `sug-tg-${projectId}-1`,
      title: 'Insight buyers',
      subtitle: 'Mid-market brand leads',
      description: `Teams evaluating ${project.name} for shared audience truth.`,
    },
    {
      id: `sug-tg-${projectId}-2`,
      title: 'Agency strategists',
      subtitle: 'Campaign planners',
      description: 'Need living persona magazines across clients.',
    },
    {
      id: `sug-tg-${projectId}-3`,
      title: 'Research ops',
      subtitle: 'Evidence curators',
      description: 'Own briefing quality and source hygiene.',
    },
    {
      id: `sug-tg-${projectId}-4`,
      title: 'Product marketers',
      subtitle: 'GTM narrative',
      description: 'Translate segment truth into positioning.',
    },
    {
      id: `sug-tg-${projectId}-5`,
      title: 'CX leads',
      subtitle: 'Journey owners',
      description: 'Connect personas to service moments.',
    },
  ]

  return { ...meta, suggestions: seeds.slice(0, max) }
}

export function runStubSuggestPersonas(
  projectId: string,
  body: SuggestPersonasRequest,
): SuggestPersonasResponse | { error: string; status: number } {
  if (!storeProjectDetail(projectId)) return { error: 'Project not found', status: 404 }
  const tgId = body.target_group_id
  const tg = storeTargetGroupDetail(tgId)
  if (!tg) return { error: 'Target group not found', status: 404 }

  const max = Math.min(Math.max(body.max_suggestions ?? 5, 1), 8)
  const upstreamBody = {
    max_suggestions: max,
    output_locale: body.output_locale ?? 'en',
  }
  const meta = stubMeta('suggestPersonas', { tgId }, upstreamBody)

  const suggestions: AiSuggestionItem[] = STUB_PERSONA_NAMES.slice(0, max).map((seed, i) => ({
    id: `sug-persona-${tgId}-${i + 1}`,
    title: seed.name,
    subtitle: seed.role,
    description: `Suggested for ${tg.name} · ${tg.segment}`,
  }))

  return { ...meta, suggestions }
}

export function runStubResearchStart(
  projectId: string,
  body: ResearchStartRequest,
): ResearchStartResponse | { error: string; status: number } {
  if (!storeProjectDetail(projectId)) return { error: 'Project not found', status: 404 }

  const upstreamBody = {
    seed_url: body.seed_url ?? '',
    max_pages: body.max_pages ?? 20,
    max_depth: body.max_depth ?? 2,
  }
  const meta = stubMeta('researchStart', { projectId }, upstreamBody)
  const jobId = `research-stub-${projectId}-${Date.now().toString(36)}`

  return { ...meta, jobId, status: 'queued' }
}

function stubPhases(prefix: string) {
  return [
    {
      id: `${prefix}-phase-1`,
      name: 'Discover',
      order: 0,
      summary: 'Stub phase — AI generate will call upstream later.',
      elements: [
        { id: `${prefix}-el-1`, kind: 'action' as const, label: 'Scan signals', order: 0 },
        { id: `${prefix}-el-2`, kind: 'thought' as const, label: 'What evidence matters?', order: 1 },
      ],
    },
    {
      id: `${prefix}-phase-2`,
      name: 'Frame',
      order: 1,
      summary: 'Align on problem statement.',
      elements: [
        { id: `${prefix}-el-3`, kind: 'pain' as const, label: 'Conflicting frames', order: 0 },
        { id: `${prefix}-el-4`, kind: 'opportunity' as const, label: 'Shared brief', order: 1 },
      ],
    },
    {
      id: `${prefix}-phase-3`,
      name: 'Decide',
      order: 2,
      summary: 'Commit to next bets.',
      elements: [
        { id: `${prefix}-el-5`, kind: 'action' as const, label: 'Pick owners', order: 0 },
        { id: `${prefix}-el-6`, kind: 'feeling' as const, label: 'Clear next step', order: 1 },
      ],
    },
  ]
}

export function runStubGenerateJourney(
  body: GenerateJourneyRequest,
  fromProjectId?: string,
): GenerateJourneyResponse | { error: string; status: number } {
  const projectId = fromProjectId ?? body.project_id ?? null
  if (fromProjectId && !storeProjectDetail(fromProjectId)) {
    return { error: 'Project not found', status: 404 }
  }

  const journeyType = body.journey_type?.trim() || 'customer'
  const tgId = body.target_group_id ?? null
  const tg = tgId ? storeTargetGroupDetail(tgId) : null
  const name = tg
    ? `${tg.name} journey (AI stub)`
    : `Generated ${journeyType} journey (AI stub)`

  const workflowId: AiWorkflowId = fromProjectId
    ? 'generateJourneyFromProject'
    : 'generateJourney'
  const pathParams = fromProjectId ? { projectId: fromProjectId } : {}
  const upstreamBody = {
    target_group_id: tgId,
    journey_type: journeyType,
    organization_id: body.organization_id ?? 'org-stub',
    project_id: projectId,
    output_locale: body.output_locale ?? 'en',
    use_async: body.use_async ?? false,
  }
  const meta = stubMeta(workflowId, pathParams, upstreamBody)
  const prefix = `ai-${Date.now().toString(36)}`
  const journey = storeCreateJourney({
    name,
    journeyType,
    status: 'draft',
    description: `Stub journey — will call ${meta.target.path}`,
    targetGroupId: tgId,
    projectId,
    phases: stubPhases(prefix),
  })

  return {
    ...meta,
    journey: { id: journey.id, name: journey.name, phaseCount: journey.phaseCount },
  }
}

export function targetHint(workflowId: AiWorkflowId): string {
  const def = AI_WORKFLOW_TARGETS[workflowId]
  return `Stub → ${def.method} ${def.upstreamPath}`
}
