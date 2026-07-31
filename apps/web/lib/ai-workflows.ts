/**
 * AI workflow registry + stubs.
 * Live path: native OpenAI (`ai-workflows-native.ts`) via withAiNativeOrStub.
 * Spec twin: knowledge/ai-workflows.md · knowledge/ai-native-2026.md
 *
 * Client-safe target metadata lives in `ai-workflow-targets.ts` (do not pull this
 * module into client components — it imports the project store / pg).
 */

import type {
  AiStubMeta,
  AiSuggestionItem,
  AiTargetCall,
  AiWorkflowId,
  EnrichPersonaRequest,
  EnrichPersonaResponse,
  GenerateJourneyPhaseMomentsRequest,
  GenerateJourneyPhaseMomentsResponse,
  GenerateJourneyRequest,
  GenerateJourneyResponse,
  GenerateMoodboardRequest,
  GenerateMoodboardResponse,
  GeneratePersonaAvatarRequest,
  GeneratePersonaAvatarResponse,
  GeneratePersonasRequest,
  GeneratePersonasResponse,
  JourneyElementKind,
  PersonaSuggestField,
  ResearchStartRequest,
  ResearchStartResponse,
  SuggestPersonaFieldRequest,
  SuggestPersonaFieldResponse,
  SuggestPersonasRequest,
  SuggestPersonasResponse,
  SuggestTargetGroupsRequest,
  SuggestTargetGroupsResponse,
  ValidateJourneyRequest,
  ValidateJourneyResponse,
} from '@audion-v3/contracts'
import { AI_WORKFLOW_TARGETS, formatUpstreamPath } from './ai-workflow-targets'
import { storeCreateJourney, storeJourneyDetail, storePatchJourney } from './fixtures/journey-store'
import { storeAppendValidationReport } from './fixtures/journey-validation-store'
import { storeCreatePersona, storePatchPersona, storePersonaDetail } from './fixtures/persona-store'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from './fixtures/target-group-store'
import { storeProjectDetail } from './fixtures/project-store'
import { storeCreateResearchRun } from './fixtures/research-runs'
import { mergeMoodboardTiles } from './moodboard-tiles'
import { personaAvatarPath, personaVisualPath } from './paths'
import { shouldPreferAiLive, shouldRequireAiLive } from './persona-api-proxy'

export {
  AI_WORKFLOW_TARGETS,
  formatUpstreamPath,
  targetHint,
  type AiWorkflowTargetDef,
} from './ai-workflow-targets'

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

export async function runStubGeneratePersonaAvatar(
  personaId: string,
  body: GeneratePersonaAvatarRequest = {},
): Promise<GeneratePersonaAvatarResponse | { error: string; status: number }> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const upstreamBody = {
    style: body.style?.trim() || undefined,
  }
  const meta = stubMeta('generatePersonaAvatar', { personaId }, upstreamBody)
  const avatarUrl = nextStubAvatarUrl(persona.avatarUrl)
  const patched = await storePatchPersona(personaId, { avatarUrl })
  if (!patched) return { error: 'Persona not found', status: 404 }

  return { ...meta, avatarUrl: patched.avatarUrl! }
}

export const FIELD_UPSTREAM: Record<
  PersonaSuggestField,
  { fieldKey: string; path: string; templateId?: string }
> = {
  interests: {
    fieldKey: 'interests',
    path: '/personas/{personaId}/ai/interests',
  },
  values: {
    fieldKey: 'values',
    path: '/personas/{personaId}/ai/values',
  },
  goals: {
    fieldKey: 'goals',
    path: '/personas/{personaId}/ai/goals',
  },
  frustrations: {
    fieldKey: 'pain-points',
    path: '/personas/{personaId}/ai/pain-points',
  },
  traits: {
    fieldKey: 'traits',
    path: '/ai-assist',
    templateId: 'persona.traits',
  },
  vocabulary: {
    fieldKey: 'vocabulary',
    path: '/ai-assist',
    templateId: 'persona.vocabulary',
  },
  sentenceStructure: {
    fieldKey: 'sentence_structure',
    path: '/ai-assist',
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

export async function runStubSuggestPersonaField(
  personaId: string,
  body: SuggestPersonaFieldRequest,
): Promise<SuggestPersonaFieldResponse | { error: string; status: number }> {
  const persona = await storePersonaDetail(personaId)
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

export async function runStubGeneratePersonas(
  tgId: string,
  body: GeneratePersonasRequest,
): Promise<GeneratePersonasResponse | { error: string; status: number }> {
  const tg = await storeTargetGroupDetail(tgId)
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

  const created = await Promise.all(
    STUB_PERSONA_NAMES.slice(0, count).map((seed) =>
      storeCreatePersona({
        name: `${seed.name} (${segment})`,
        role: seed.role,
        status: 'draft',
        archetype: segment,
        bio: `Stub persona from AI generate — will call ${meta.target.path}`,
        projectId: tg.projectId,
        interests: [segment],
      }),
    ),
  )

  const linkedIds = [...tg.linkedPersonas.map((p) => p.id), ...created.map((p) => p.id)]
  await storePatchTargetGroup(tgId, { linkedPersonaIds: linkedIds })

  return {
    ...meta,
    personas: created.map((p) => ({ id: p.id, name: p.name, role: p.role })),
  }
}

export async function runStubSuggestTargetGroups(
  projectId: string,
  body: SuggestTargetGroupsRequest,
): Promise<SuggestTargetGroupsResponse | { error: string; status: number }> {
  const project = await storeProjectDetail(projectId)
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

export async function runStubSuggestPersonas(
  projectId: string,
  body: SuggestPersonasRequest,
): Promise<SuggestPersonasResponse | { error: string; status: number }> {
  if (!(await storeProjectDetail(projectId))) return { error: 'Project not found', status: 404 }
  const tgId = body.target_group_id
  const tg = await storeTargetGroupDetail(tgId)
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

export async function runStubResearchStart(
  projectId: string,
  body: ResearchStartRequest,
): Promise<ResearchStartResponse | { error: string; status: number }> {
  if (!(await storeProjectDetail(projectId))) return { error: 'Project not found', status: 404 }

  const upstreamBody = {
    seed_url: body.seed_url ?? '',
    max_pages: body.max_pages ?? 20,
    max_depth: body.max_depth ?? 2,
  }
  const meta = stubMeta('researchStart', { projectId }, upstreamBody)
  const jobId = storeCreateResearchRun(projectId, String(body.seed_url ?? ''), true)

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

export async function runStubGenerateJourney(
  body: GenerateJourneyRequest,
  fromProjectId?: string,
): Promise<GenerateJourneyResponse | { error: string; status: number }> {
  const projectId = fromProjectId ?? body.project_id ?? null
  if (fromProjectId && !(await storeProjectDetail(fromProjectId))) {
    return { error: 'Project not found', status: 404 }
  }

  const journeyType = body.journey_type?.trim() || 'customer'
  const tgId = body.target_group_id ?? null
  const tg = tgId ? await storeTargetGroupDetail(tgId) : null
  const name = tg
    ? `${tg.name} journey (AI stub)`
    : `Generated ${journeyType} journey (AI stub)`

  const workflowId: AiWorkflowId = fromProjectId
    ? 'generateJourneyFromProject'
    : 'generateJourney'
  const pathParams: Record<string, string> = fromProjectId ? { projectId: fromProjectId } : {}
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
  const journey = await storeCreateJourney({
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

function uniqStrings(items: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const s = raw.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= max) break
  }
  return out
}

export async function runStubEnrichPersona(
  personaId: string,
  body: EnrichPersonaRequest = {},
): Promise<EnrichPersonaResponse | { error: string; status: number }> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const locale = body.output_locale ?? 'en'
  const upstreamBody: Record<string, unknown> = {
    output_locale: locale,
    profile_overlay: body.profile_overlay ?? undefined,
  }
  const meta = stubMeta('enrichPersona', { personaId }, upstreamBody)

  const seedTag = persona.archetype || persona.role || 'audience'
  const interests = uniqStrings(
    [...persona.interests, `Evidence for ${seedTag}`, 'Workshop synthesis', 'Decision trails'],
    8,
  )
  const values = uniqStrings([...persona.values, 'Clarity', 'Shared ownership', 'Craft'], 6)
  const goals = [
    ...persona.goals,
    { label: `Make ${seedTag} decisions evidence-led`, priority: persona.goals.length + 1 },
    { label: 'Keep the magazine brief alive after workshops', priority: persona.goals.length + 2 },
  ].slice(0, 6)
  const frustrations = [
    ...persona.frustrations,
    { label: 'Stale personas nobody updates', evidenceCount: 1 },
    { label: 'Slide decks that replace decisions', evidenceCount: 1 },
  ].slice(0, 6)
  const traits = {
    ...persona.traits,
    Curious: persona.traits.Curious ?? 0.72,
    Decisive: persona.traits.Decisive ?? 0.64,
    Empathetic: persona.traits.Empathetic ?? 0.7,
  }

  const patched = await storePatchPersona(personaId, {
    bio: body.profile_overlay?.bio?.trim() || persona.bio,
    age: body.profile_overlay?.age?.trim() || persona.age,
    location: body.profile_overlay?.location?.trim() || persona.location,
    gender: body.profile_overlay?.gender?.trim() || persona.gender,
    interests,
    values,
    goals,
    frustrations,
    traits,
  })
  if (!patched) return { error: 'Persona not found', status: 404 }

  return {
    ...meta,
    personaId,
    facetsUpdated: ['interests', 'values', 'goals', 'frustrations', 'traits'],
    interests: patched.interests,
    values: patched.values,
    goals: patched.goals,
    frustrations: patched.frustrations,
    traits: patched.traits,
  }
}

export async function runStubGenerateMoodboard(
  personaId: string,
  body: GenerateMoodboardRequest = {},
): Promise<GenerateMoodboardResponse | { error: string; status: number }> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const upstreamBody = { title: body.title?.trim() || `${persona.name} moodboard` }
  const meta = stubMeta('generateMoodboard', { personaId }, upstreamBody)

  const styleKeywords = uniqStrings(
    [
      ...(persona.visuals?.styleKeywords ?? []),
      ...(persona.colorPalette ?? []),
      persona.attentionSpan || '',
      'editorial light',
      'tactile paper',
      'calm UI chrome',
      persona.archetype || persona.role,
    ],
    8,
  )

  const tileDefs = [
    { slug: 'tone-warm', category: 'tone', caption: 'Atmosphere' },
    { slug: 'material-soft', category: 'material', caption: 'Texture' },
    { slug: 'ui-calm', category: 'ui', caption: 'Interface cues' },
    { slug: 'space-studio', category: 'space', caption: 'Context space' },
  ] as const

  const candidates = tileDefs.map((def, i) => ({
    id: `mood-stub-${personaId}-${i + 1}`,
    imageUrl: personaVisualPath(def.slug),
    category: def.category,
    caption: `${def.caption} · ${persona.name}`,
    locked: false as const,
  }))

  const tiles = mergeMoodboardTiles(persona.visuals?.tiles ?? [], candidates)
  const visuals = { styleKeywords, tiles }
  const patched = await storePatchPersona(personaId, { visuals })
  if (!patched) return { error: 'Persona not found', status: 404 }

  return {
    ...meta,
    personaId,
    moodboardId: `moodboard-stub-${personaId}`,
    status: 'stubbed',
    visuals: patched.visuals ?? visuals,
  }
}

const KIND_CYCLE: JourneyElementKind[] = [
  'action',
  'thought',
  'feeling',
  'pain',
  'opportunity',
]

function newMomentId(): string {
  return `el-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export async function runStubGenerateJourneyPhaseMoments(
  journeyId: string,
  body: GenerateJourneyPhaseMomentsRequest,
): Promise<GenerateJourneyPhaseMomentsResponse | { error: string; status: number }> {
  const journey = await storeJourneyDetail(journeyId)
  if (!journey) return { error: 'Journey not found', status: 404 }
  const phase = journey.phases.find((p) => p.id === body.phase_id)
  if (!phase) return { error: 'Phase not found', status: 404 }

  const max = Math.min(Math.max(body.max_suggestions ?? 4, 1), 8)
  const upstreamBody: Record<string, unknown> = {
    template_id: 'journey.moments',
    phase_id: body.phase_id,
    max_suggestions: max,
    output_locale: body.output_locale ?? 'en',
    phase_context: {
      phase_name: phase.name,
      phase_summary: phase.summary,
    },
  }
  const meta = stubMeta('generateJourneyPhaseMoments', { journeyId }, upstreamBody)

  const seeds = [
    `Act on ${phase.name.toLowerCase()}`,
    `Ask: does this match the brief?`,
    `Notice tension in ${phase.name.toLowerCase()}`,
    `Capture a decision signal`,
    `Hand off with a clear owner`,
  ]
  const existingLabels = new Set(phase.elements.map((el) => el.label.toLowerCase()))
  const fresh = seeds.filter((s) => !existingLabels.has(s.toLowerCase())).slice(0, max)
  const startOrder = phase.elements.length
  const newMoments = fresh.map((label, i) => ({
    id: newMomentId(),
    kind: KIND_CYCLE[i % KIND_CYCLE.length]!,
    label,
    order: startOrder + i,
  }))
  const moments = [...phase.elements, ...newMoments].map((el, order) => ({ ...el, order }))

  const phases = journey.phases.map((p) =>
    p.id === phase.id ? { ...p, elements: moments } : p,
  )
  const patched = await storePatchJourney(journeyId, {
    name: journey.name,
    journeyType: journey.journeyType,
    status: journey.status,
    description: journey.description,
    targetGroupId: journey.targetGroupId,
    projectId: journey.projectId,
    phases,
  })
  if (!patched) return { error: 'Journey not found', status: 404 }

  const appliedPhase = patched.phases.find((p) => p.id === phase.id)
  return {
    ...meta,
    journeyId,
    phaseId: phase.id,
    applied: true,
    moments: appliedPhase?.elements ?? moments,
  }
}

function fitStatus(score: number): 'good' | 'warning' | 'critical' {
  if (score >= 70) return 'good'
  if (score >= 45) return 'warning'
  return 'critical'
}

export async function scoreValidateJourney(
  journeyId: string,
  body: ValidateJourneyRequest,
): Promise<
  | {
      journeyId: string
      mode: NonNullable<ValidateJourneyRequest['mode']>
      overallFitScore: number
      validatedAt: string
      personaId: string
      phases: ValidateJourneyResponse['phases']
      upstreamBody: Record<string, unknown>
    }
  | { error: string; status: number }
> {
  const journey = await storeJourneyDetail(journeyId)
  if (!journey) return { error: 'Journey not found', status: 404 }
  const personaIds = body.persona_ids?.filter(Boolean) ?? []
  if (!personaIds.length) return { error: 'At least one persona_id required', status: 400 }
  const personaId = personaIds[0]!
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const mode = body.mode ?? 'automated'
  const chatMode = mode === 'chat' || mode === 'both'
  const upstreamBody: Record<string, unknown> = {
    persona_ids: personaIds,
    mode,
  }

  const goalHints = persona.goals.map((g) => g.label.toLowerCase())
  const painHints = persona.frustrations.map((f) => f.label.toLowerCase())
  const firstGoal = persona.goals[0]?.label
  const firstPain = persona.frustrations[0]?.label

  const phases = journey.phases.map((phase) => {
    const density = Math.min(100, 40 + phase.elements.length * 12)
    const text = `${phase.name} ${phase.summary ?? ''} ${phase.elements.map((e) => e.label).join(' ')}`.toLowerCase()
    const goalHit = goalHints.some((g) => g && text.includes(g.slice(0, 12)))
    const painHit = painHints.some((p) => p && text.includes(p.slice(0, 12)))
    let fitScore = density
    if (goalHit) fitScore = Math.min(100, fitScore + 12)
    if (painHit) fitScore = Math.min(100, fitScore + 8)
    if (!phase.elements.length) fitScore = Math.max(20, fitScore - 25)
    if (chatMode && !goalHit) fitScore = Math.max(15, fitScore - 6)
    fitScore = Math.round(fitScore * 10) / 10

    const frictionPoints =
      phase.elements.length === 0
        ? [
            {
              description: `Phase “${phase.name}” has no moments for ${persona.name} to react to.`,
              severity: 'high' as const,
              personaQuote: chatMode
                ? `As ${persona.name}: “I stall in ${phase.name} — there is nothing concrete to do.”`
                : `I need concrete steps in ${phase.name}.`,
            },
          ]
        : painHit
          ? chatMode
            ? [
                {
                  description: `Persona voice: ${phase.name} echoes a known frustration.`,
                  severity: 'low' as const,
                  personaQuote: firstPain
                    ? `“This reminds me of ${firstPain} — good that you named it.”`
                    : `“I feel seen in ${phase.name}.”`,
                },
              ]
            : []
          : [
              {
                description: `Little explicit connection to ${persona.name}'s known frustrations.`,
                severity: 'medium' as const,
                personaQuote: chatMode
                  ? `As ${persona.name}: “In ${phase.name} I still wonder how this helps with ${firstPain || 'my blockers'}.”`
                  : null,
              },
            ]

    const recommendations: string[] = []
    if (!phase.elements.length) {
      recommendations.push('Generate moments for this phase before validating again.')
    } else if (!goalHit) {
      recommendations.push(
        chatMode && firstGoal
          ? `Ask ${persona.name} in chat how ${phase.name} advances “${firstGoal}”.`
          : `Tie a moment to a goal of ${persona.name}.`,
      )
    }
    if (fitScore < 70) {
      recommendations.push(
        chatMode
          ? 'Run a short persona chat on the weakest handoff, then re-validate.'
          : 'Add a decision or handoff moment with a clear owner.',
      )
    }

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      fitScore,
      status: fitStatus(fitScore),
      frictionPoints,
      recommendations,
    }
  })

  const overallFitScore =
    phases.length === 0
      ? 0
      : Math.round((phases.reduce((sum, p) => sum + p.fitScore, 0) / phases.length) * 10) / 10

  return {
    journeyId,
    mode,
    overallFitScore,
    validatedAt: new Date().toISOString(),
    personaId,
    phases,
    upstreamBody,
  }
}

export async function runStubValidateJourney(
  journeyId: string,
  body: ValidateJourneyRequest,
): Promise<ValidateJourneyResponse | { error: string; status: number }> {
  const scored = await scoreValidateJourney(journeyId, body)
  if ('error' in scored) return scored
  const meta = stubMeta('validateJourney', { journeyId }, scored.upstreamBody)
  return storeAppendValidationReport({
    ...meta,
    journeyId: scored.journeyId,
    mode: scored.mode,
    overallFitScore: scored.overallFitScore,
    validatedAt: scored.validatedAt,
    personaId: scored.personaId,
    phases: scored.phases,
  })
}

type AiErr = { error: string; status: number; detail?: string }

/**
 * Route helper: try native AI when preferred; fall back to stub unless native-required.
 * `live` callback is the native runner (name kept for call-site compatibility).
 */
export async function withAiNativeOrStub<T extends { stubbed: boolean }>(
  request: Request,
  live: (authorization: string | null) => Promise<T | AiErr>,
  stub: () => T | { error: string; status: number } | Promise<T | { error: string; status: number }>,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number; detail?: string }> {
  if (shouldPreferAiLive()) {
    const authorization = request.headers.get('authorization')
    const liveResult = await live(authorization)
    if (!('error' in liveResult)) {
      return { ok: true, data: liveResult }
    }
    if (shouldRequireAiLive()) {
      return {
        ok: false,
        error: liveResult.error,
        status: liveResult.status,
        detail: liveResult.detail,
      }
    }
  }
  const stubResult = await stub()
  if ('error' in stubResult) {
    return { ok: false, error: stubResult.error, status: stubResult.status }
  }
  return { ok: true, data: stubResult }
}

/** @deprecated Use withAiNativeOrStub */
export const withAiLiveOrStub = withAiNativeOrStub
