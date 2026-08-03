/**
 * Native AI workflow runners — OpenAI in-process, fixture store writes.
 * Spec twin: knowledge/ai-native-2026.md
 */

import type {
  AiSuggestionItem,
  AiTargetCall,
  EnrichPersonaRequest,
  EnrichPersonaResponse,
  DerivePersonaAgentProfileRequest,
  DerivePersonaAgentProfileResponse,
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
import {
  AI_WORKFLOW_TARGETS,
  buildTargetCall,
  FIELD_UPSTREAM,
  formatUpstreamPath,
  scoreValidateJourney,
} from './ai-workflows'
import { runAssist, runAssistJson } from './ai/assist'
import {
  createOpenAiClient,
  getAiOpenAiImageModel,
  toAiNativeError,
  type AiNativeError,
} from './ai/client'
import {
  buildJourneyPhaseAssistVars,
  buildPersonaAssistVars,
  personaProfileText,
} from './ai/prompts/context'
import type { AssistTemplateId } from './ai/prompts/templates'
import { storeCreateJourney, storeJourneyDetail, storePatchJourney } from './fixtures/journey-store'
import { storeAppendValidationReport } from './fixtures/journey-validation-store'
import { storeCreatePersona, storePatchPersona, storePersonaDetail } from './fixtures/persona-store'
import { storeProjectDetail } from './fixtures/project-store'
import { storeCreateResearchRun } from './fixtures/research-runs'
import {
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from './fixtures/target-group-store'
import { mergeMoodboardTiles } from './moodboard-tiles'
import { coerceJourneyBehavior, coerceMotivations } from './persona-coerce'
import {
  deriveJourneyBehavior,
  deriveResearchProfile,
  normalizeDeriveFacets,
} from './persona-agent-derive'
import { personaVisualPath } from './paths'
import { scheduleNativeResearchJob } from './ai/research-native'

export type NativeError = AiNativeError

function nativeMeta(
  workflowId: keyof typeof AI_WORKFLOW_TARGETS,
  pathParams: Record<string, string>,
  body: Record<string, unknown>,
): { stubbed: false; workflowId: typeof workflowId; target: AiTargetCall } {
  return {
    stubbed: false,
    workflowId,
    target: buildTargetCall(workflowId, pathParams, body),
  }
}

const FIELD_TEMPLATE: Record<PersonaSuggestField, AssistTemplateId> = {
  interests: 'persona.interests',
  values: 'persona.values',
  goals: 'persona.goals',
  frustrations: 'persona.pain_points',
  traits: 'persona.traits',
  vocabulary: 'persona.vocabulary',
  sentenceStructure: 'persona.sentence_structure',
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

const KIND_CYCLE: JourneyElementKind[] = [
  'action',
  'thought',
  'feeling',
  'pain',
  'opportunity',
]

function parseKind(raw: unknown, index: number): JourneyElementKind {
  const s = String(raw || '').toLowerCase().replace(/[_-]/g, '')
  if (KIND_CYCLE.includes(s as JourneyElementKind)) return s as JourneyElementKind
  if (s === 'painpoint' || s === 'pain') return 'pain'
  if (s === 'touchpoint' || s === 'feeling' || s === 'quote') return 'feeling'
  if (s === 'opportunity') return 'opportunity'
  if (s === 'thought') return 'thought'
  if (s === 'action') return 'action'
  return KIND_CYCLE[index % KIND_CYCLE.length]!
}

export async function runNativeSuggestPersonaField(
  personaId: string,
  body: SuggestPersonaFieldRequest,
  _authorization?: string | null,
): Promise<SuggestPersonaFieldResponse | NativeError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const field = body.field
  if (!field || !(field in FIELD_UPSTREAM)) {
    return { error: 'Unknown suggest field', status: 400 }
  }
  const max = Math.min(Math.max(body.max_suggestions ?? 3, 1), 6)
  const locale = body.output_locale ?? 'en'
  const upstream = FIELD_UPSTREAM[field]
  const upstreamBody: Record<string, unknown> = {
    max_suggestions: max,
    output_locale: locale,
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
  const assist = await runAssist(
    FIELD_TEMPLATE[field],
    buildPersonaAssistVars(persona, { locale, maxItems: max }),
  )
  if ('error' in assist) return assist
  const suggestions: AiSuggestionItem[] = assist.suggestions.slice(0, max).map((s, i) => ({
    ...s,
    id: s.id || `sug-${field}-${personaId}-${i + 1}`,
    subtitle: s.subtitle ?? persona.name,
  }))
  return {
    stubbed: false,
    workflowId: 'suggestPersonaField',
    target,
    field,
    suggestions,
  }
}

export async function runNativeEnrichPersona(
  personaId: string,
  body: EnrichPersonaRequest = {},
  _authorization?: string | null,
): Promise<EnrichPersonaResponse | NativeError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const locale = body.output_locale ?? 'en'
  const upstreamBody: Record<string, unknown> = {
    output_locale: locale,
    profile_overlay: body.profile_overlay ?? undefined,
  }
  const meta = nativeMeta('enrichPersona', { personaId }, upstreamBody)
  const assist = await runAssistJson<{
    interests?: string[]
    values?: string[]
    goals?: Array<{ label?: string } | string>
    frustrations?: Array<{ label?: string } | string>
    traits?: Record<string, number>
  }>('persona.enrich_facets', buildPersonaAssistVars(persona, { locale }))
  if ('error' in assist) return assist
  const data = assist.data
  const interests = uniqStrings(
    [...persona.interests, ...(Array.isArray(data.interests) ? data.interests : [])],
    8,
  )
  const values = uniqStrings(
    [...persona.values, ...(Array.isArray(data.values) ? data.values : [])],
    6,
  )
  const goalLabels = (data.goals ?? []).map((g) =>
    typeof g === 'string' ? g : String(g.label || ''),
  )
  const goals = [
    ...persona.goals,
    ...goalLabels.filter(Boolean).map((label, i) => ({
      label,
      priority: persona.goals.length + i + 1,
    })),
  ].slice(0, 6)
  const frLabels = (data.frustrations ?? []).map((f) =>
    typeof f === 'string' ? f : String(f.label || ''),
  )
  const frustrations = [
    ...persona.frustrations,
    ...frLabels.filter(Boolean).map((label) => ({ label, evidenceCount: 1 })),
  ].slice(0, 6)
  const traits = { ...persona.traits, ...(data.traits ?? {}) }
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

function clamp01(n: unknown, fallback = 0.5): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(1, Math.max(0, v))
}

export async function runNativeDerivePersonaAgentProfile(
  personaId: string,
  body: DerivePersonaAgentProfileRequest = {},
  _authorization?: string | null,
): Promise<DerivePersonaAgentProfileResponse | NativeError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }

  const facets = normalizeDeriveFacets(body.facets)
  const locale = body.output_locale ?? 'en'
  const upstreamBody: Record<string, unknown> = { output_locale: locale, facets }
  const meta = nativeMeta('derivePersonaAgentProfile', { personaId }, upstreamBody)

  const assist = await runAssistJson<{
    techLiteracy?: number
    emotionalBaseline?: string
    stressTriggers?: string[]
    motivations?: unknown
    journeyBehavior?: unknown
  }>('persona.derive_agent_profile', buildPersonaAssistVars(persona, { locale }))

  const heuristicResearch = deriveResearchProfile(persona)
  const heuristicJourney = deriveJourneyBehavior(persona)

  let research = heuristicResearch
  let journey = heuristicJourney

  if (!('error' in assist)) {
    const data = assist.data
    research = {
      techLiteracy: clamp01(data.techLiteracy, heuristicResearch.techLiteracy),
      emotionalBaseline:
        typeof data.emotionalBaseline === 'string' && data.emotionalBaseline.trim()
          ? data.emotionalBaseline.trim()
          : heuristicResearch.emotionalBaseline,
      stressTriggers: Array.isArray(data.stressTriggers)
        ? uniqStrings(
            [...(persona.stressTriggers ?? []), ...data.stressTriggers.map(String)],
            8,
          )
        : heuristicResearch.stressTriggers,
      motivations: (() => {
        const parsed = coerceMotivations(data.motivations)
        if (!parsed.length) return heuristicResearch.motivations
        const seen = new Set(
          (persona.motivations ?? []).map((m) => m.label.trim().toLowerCase()),
        )
        const merged = [...(persona.motivations ?? [])]
        for (const m of parsed) {
          const key = m.label.trim().toLowerCase()
          if (!key || seen.has(key)) continue
          seen.add(key)
          merged.push(m)
          if (merged.length >= 8) break
        }
        return merged.length ? merged : heuristicResearch.motivations
      })(),
    }
    const jb = coerceJourneyBehavior(data.journeyBehavior)
    if (jb) {
      journey = {
        dimensionOverrides: {
          ...heuristicJourney.dimensionOverrides,
          ...(jb.dimensionOverrides ?? {}),
        },
        dos: uniqStrings([...(jb.dos ?? []), ...(heuristicJourney.dos ?? [])], 8),
        donts: uniqStrings([...(jb.donts ?? []), ...(heuristicJourney.donts ?? [])], 8),
        heuristics: uniqStrings(
          [...(jb.heuristics ?? []), ...(heuristicJourney.heuristics ?? [])],
          8,
        ),
        extraInstructions:
          jb.extraInstructions?.trim() || heuristicJourney.extraInstructions,
      }
    }
  }

  const patch: Parameters<typeof storePatchPersona>[1] = {}
  if (facets.includes('researchProfile')) {
    patch.techLiteracy = research.techLiteracy
    patch.emotionalBaseline = research.emotionalBaseline
    patch.stressTriggers = research.stressTriggers
    patch.motivations = research.motivations
  }
  if (facets.includes('journeyBehavior')) {
    patch.journeyBehavior = journey
  }

  const patched = await storePatchPersona(personaId, patch)
  if (!patched) return { error: 'Persona not found', status: 404 }

  return {
    ...meta,
    personaId,
    facetsUpdated: facets,
    techLiteracy: patched.techLiteracy,
    emotionalBaseline: patched.emotionalBaseline,
    stressTriggers: patched.stressTriggers,
    motivations: patched.motivations,
    journeyBehavior: patched.journeyBehavior,
  }
}

export async function runNativeGeneratePersonas(
  tgId: string,
  body: GeneratePersonasRequest,
  _authorization?: string | null,
): Promise<GeneratePersonasResponse | NativeError> {
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
  const meta = nativeMeta('generatePersonas', { tgId }, upstreamBody)
  const locale = body.output_locale ?? 'en'

  let packSeed = ''
  if (tg.projectId) {
    const project = await storeProjectDetail(tg.projectId)
    if (project?.platformProjectId) {
      const { loadPackSeedForPlatformProject } = await import('./plexon-knowledge-pack')
      packSeed = await loadPackSeedForPlatformProject(project.platformProjectId)
    }
  }

  const assist = await runAssistJson<{
    personas?: Array<{
      name?: string
      role?: string
      archetype?: string
      bio?: string
      interests?: string[]
    }>
  }>('persona.generate_batch', {
    locale,
    max_items: String(count),
    context: [
      `Name: ${tg.name}`,
      `Segment: ${segment}`,
      `Description: ${description ?? ''}`,
      packSeed,
    ]
      .filter(Boolean)
      .join('\n'),
  })
  if ('error' in assist) return assist
  const drafts = (assist.data.personas ?? []).slice(0, count)
  if (!drafts.length) {
    return { error: 'Native generate returned no personas', status: 502 }
  }
  const created = await Promise.all(
    drafts.map((seed) =>
      storeCreatePersona({
        name: seed.name?.trim() || `Persona (${segment})`,
        role: seed.role?.trim() || 'Audience member',
        status: 'draft',
        archetype: seed.archetype?.trim() || segment,
        bio: seed.bio?.trim() || `Generated for ${tg.name}`,
        projectId: tg.projectId,
        interests: seed.interests?.length ? seed.interests : [segment],
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

export async function runNativeSuggestTargetGroups(
  projectId: string,
  body: SuggestTargetGroupsRequest,
  _authorization?: string | null,
): Promise<SuggestTargetGroupsResponse | NativeError> {
  const project = await storeProjectDetail(projectId)
  if (!project) return { error: 'Project not found', status: 404 }
  const max = Math.min(Math.max(body.max_suggestions ?? 5, 1), 8)
  const locale = body.output_locale ?? 'en'
  const upstreamBody = {
    max_suggestions: max,
    output_locale: locale,
    bilingual: body.bilingual ?? false,
  }
  const meta = nativeMeta('suggestTargetGroups', { projectId }, upstreamBody)

  let packSeed = ''
  if (project.platformProjectId) {
    const { loadPackSeedForPlatformProject } = await import('./plexon-knowledge-pack')
    packSeed = await loadPackSeedForPlatformProject(project.platformProjectId)
  }

  const assist = await runAssist('project.suggest_target_groups', {
    locale,
    max_items: String(max),
    context: [
      `Project: ${project.name}`,
      `Description: ${project.description ?? ''}`,
      packSeed,
    ]
      .filter(Boolean)
      .join('\n'),
  })
  if ('error' in assist) return assist
  return { ...meta, suggestions: assist.suggestions.slice(0, max) }
}

export async function runNativeSuggestPersonas(
  projectId: string,
  body: SuggestPersonasRequest,
  _authorization?: string | null,
): Promise<SuggestPersonasResponse | NativeError> {
  const project = await storeProjectDetail(projectId)
  if (!project) return { error: 'Project not found', status: 404 }
  const tgId = body.target_group_id
  const tg = await storeTargetGroupDetail(tgId)
  if (!tg) return { error: 'Target group not found', status: 404 }
  const max = Math.min(Math.max(body.max_suggestions ?? 5, 1), 8)
  const locale = body.output_locale ?? 'en'
  const upstreamBody = { max_suggestions: max, output_locale: locale }
  const meta = nativeMeta('suggestPersonas', { tgId }, upstreamBody)

  let packSeed = ''
  if (project.platformProjectId) {
    const { loadPackSeedForPlatformProject } = await import('./plexon-knowledge-pack')
    packSeed = await loadPackSeedForPlatformProject(project.platformProjectId)
  }

  const assist = await runAssist('target_group.suggest_personas', {
    locale,
    max_items: String(max),
    context: [
      `TG: ${tg.name}`,
      `Segment: ${tg.segment}`,
      `Description: ${tg.description ?? ''}`,
      packSeed,
    ]
      .filter(Boolean)
      .join('\n'),
  })
  if ('error' in assist) return assist
  return { ...meta, suggestions: assist.suggestions.slice(0, max) }
}

export async function runNativeGenerateJourney(
  body: GenerateJourneyRequest,
  fromProjectId?: string,
  _authorization?: string | null,
): Promise<GenerateJourneyResponse | NativeError> {
  const projectId = fromProjectId ?? body.project_id ?? null
  if (fromProjectId && !(await storeProjectDetail(fromProjectId))) {
    return { error: 'Project not found', status: 404 }
  }
  const journeyType = body.journey_type?.trim() || 'customer'
  const tgId = body.target_group_id ?? null
  const tg = tgId ? await storeTargetGroupDetail(tgId) : null
  const workflowId = fromProjectId ? 'generateJourneyFromProject' : 'generateJourney'
  const pathParams: Record<string, string> = fromProjectId ? { projectId: fromProjectId } : {}
  const upstreamBody = {
    target_group_id: tgId,
    journey_type: journeyType,
    organization_id: body.organization_id ?? 'org-native',
    project_id: projectId,
    output_locale: body.output_locale ?? 'en',
    use_async: body.use_async ?? false,
  }
  const meta = nativeMeta(workflowId, pathParams, upstreamBody)
  const locale = body.output_locale ?? 'en'
  const assist = await runAssistJson<{
    name?: string
    description?: string
    phases?: Array<{
      name?: string
      summary?: string
      elements?: Array<{ kind?: string; label?: string }>
    }>
  }>('journey.full_generation', {
    locale,
    context: [
      `Journey type: ${journeyType}`,
      tg ? `Target group: ${tg.name} (${tg.segment})` : '',
      projectId ? `Project id: ${projectId}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  })
  if ('error' in assist) return assist
  const prefix = `ai-${Date.now().toString(36)}`
  const phases = (assist.data.phases ?? []).slice(0, 5).map((phase, order) => ({
    id: `${prefix}-phase-${order + 1}`,
    name: phase.name?.trim() || `Phase ${order + 1}`,
    order,
    summary: phase.summary?.trim() || null,
    elements: (phase.elements ?? []).slice(0, 6).map((el, i) => ({
      id: `${prefix}-el-${order + 1}-${i + 1}`,
      kind: parseKind(el.kind, i),
      label: el.label?.trim() || `Moment ${i + 1}`,
      order: i,
    })),
  }))
  if (!phases.length) {
    return { error: 'Native journey returned no phases', status: 502 }
  }
  const name =
    assist.data.name?.trim() ||
    (tg ? `${tg.name} journey` : `Generated ${journeyType} journey`)
  const journey = await storeCreateJourney({
    name,
    journeyType,
    status: 'draft',
    description: assist.data.description?.trim() || `Native AI journey (${journeyType})`,
    targetGroupId: tgId,
    projectId,
    phases,
  })
  return {
    ...meta,
    journey: { id: journey.id, name: journey.name, phaseCount: journey.phaseCount },
  }
}

export async function runNativeGenerateJourneyPhaseMoments(
  journeyId: string,
  body: GenerateJourneyPhaseMomentsRequest,
  _authorization?: string | null,
): Promise<GenerateJourneyPhaseMomentsResponse | NativeError> {
  const journey = await storeJourneyDetail(journeyId)
  if (!journey) return { error: 'Journey not found', status: 404 }
  const phase = journey.phases.find((p) => p.id === body.phase_id)
  if (!phase) return { error: 'Phase not found', status: 404 }
  const max = Math.min(Math.max(body.max_suggestions ?? 4, 1), 8)
  const locale = body.output_locale ?? 'en'
  const upstreamBody: Record<string, unknown> = {
    template_id: 'journey.moments',
    phase_id: body.phase_id,
    max_suggestions: max,
    output_locale: locale,
    phase_context: { phase_name: phase.name, phase_summary: phase.summary },
  }
  const meta = nativeMeta('generateJourneyPhaseMoments', { journeyId }, upstreamBody)
  const assist = await runAssistJson<{
    moments?: Array<{
      kind?: string
      label?: string
      element_type?: string
      title?: string
      content?: string
    }>
  }>('journey.moments', buildJourneyPhaseAssistVars(journey, body.phase_id, { locale, maxItems: max }))
  if ('error' in assist) return assist
  const existingLabels = new Set(phase.elements.map((el) => el.label.toLowerCase()))
  const fresh = (assist.data.moments ?? [])
    .map((m) => {
      const label = (m.label || m.title || m.content || '').trim()
      const kindRaw = m.kind || m.element_type
      return { label, kindRaw }
    })
    .filter((m) => m.label && !existingLabels.has(m.label.toLowerCase()))
    .slice(0, max)
  const startOrder = phase.elements.length
  const newMoments = fresh.map((m, i) => ({
    id: `el-ai-${Date.now().toString(36)}-${i}`,
    kind: parseKind(m.kindRaw, i),
    label: m.label,
    order: startOrder + i,
  }))
  const moments = [...phase.elements, ...newMoments].map((el, order) => ({ ...el, order }))
  const phases = journey.phases.map((p) =>
    p.id === phase.id ? { ...p, elements: moments } : p,
  )
  const patched = await storePatchJourney(journeyId, { phases })
  if (!patched) return { error: 'Journey not found', status: 404 }
  return {
    ...meta,
    journeyId,
    phaseId: phase.id,
    applied: true,
    moments: newMoments,
  }
}

export async function runNativeValidateJourney(
  journeyId: string,
  body: ValidateJourneyRequest,
  _authorization?: string | null,
): Promise<ValidateJourneyResponse | NativeError> {
  const scored = await scoreValidateJourney(journeyId, body)
  if ('error' in scored) return scored

  let phases = scored.phases
  const chatMode = scored.mode === 'chat' || scored.mode === 'both'
  if (chatMode) {
    const persona = await storePersonaDetail(scored.personaId)
    const journey = await storeJourneyDetail(journeyId)
    if (persona && journey) {
      const context = journey.phases
        .map(
          (p) =>
            `- ${p.id} | ${p.name}: ${p.summary ?? ''} · moments: ${p.elements.map((e) => e.label).join('; ') || '(none)'}`,
        )
        .join('\n')
      const assist = await runAssistJson<{
        phaseQuotes?: Array<{
          phaseId?: string
          personaQuote?: string
          friction?: string
          recommendation?: string
        }>
      }>('journey.validate_chat', {
        locale: 'en',
        persona_profile: personaProfileText(persona),
        context,
      })
      if (!('error' in assist) && assist.data.phaseQuotes?.length) {
        const byId = new Map(
          assist.data.phaseQuotes
            .filter((q) => q.phaseId)
            .map((q) => [q.phaseId!, q] as const),
        )
        phases = phases.map((phase) => {
          const quote = byId.get(phase.phaseId)
          if (!quote) return phase
          const frictionPoints = [...phase.frictionPoints]
          if (quote.personaQuote || quote.friction) {
            frictionPoints.unshift({
              description: quote.friction || `Persona chat reaction to ${phase.phaseName}`,
              severity: phase.status === 'critical' ? 'high' : 'medium',
              personaQuote: quote.personaQuote ?? null,
            })
          }
          const recommendations = quote.recommendation
            ? [quote.recommendation, ...phase.recommendations]
            : phase.recommendations
          return { ...phase, frictionPoints, recommendations }
        })
      }
    }
  }

  const meta = nativeMeta('validateJourney', { journeyId }, scored.upstreamBody)
  return storeAppendValidationReport({
    ...meta,
    journeyId: scored.journeyId,
    mode: scored.mode,
    overallFitScore: scored.overallFitScore,
    validatedAt: new Date().toISOString(),
    personaId: scored.personaId,
    phases,
  })
}

export async function runNativeGeneratePersonaAvatar(
  personaId: string,
  body: GeneratePersonaAvatarRequest = {},
  _authorization?: string | null,
): Promise<GeneratePersonaAvatarResponse | NativeError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const upstreamBody = { style: body.style?.trim() || undefined }
  const meta = nativeMeta('generatePersonaAvatar', { personaId }, upstreamBody)
  try {
    const client = createOpenAiClient()
    const prompt = [
      `Professional editorial portrait of ${persona.name}, ${persona.role}.`,
      persona.archetype ? `Archetype: ${persona.archetype}.` : '',
      body.style?.trim() ? `Style: ${body.style.trim()}.` : 'Clean magazine lighting, neutral background.',
      'No text overlays.',
    ]
      .filter(Boolean)
      .join(' ')
    const image = await client.images.generate({
      model: getAiOpenAiImageModel(),
      prompt,
      size: '1024x1024',
      n: 1,
    })
    const b64 = image.data?.[0]?.b64_json
    const url = image.data?.[0]?.url
    const avatarUrl = b64
      ? `data:image/png;base64,${b64}`
      : url || persona.avatarUrl || personaVisualPath('tone-warm')
    const patched = await storePatchPersona(personaId, { avatarUrl })
    if (!patched) return { error: 'Persona not found', status: 404 }
    return { ...meta, avatarUrl: patched.avatarUrl! }
  } catch (error) {
    return toAiNativeError(error, 'Avatar generation failed')
  }
}

export async function runNativeGenerateMoodboard(
  personaId: string,
  body: GenerateMoodboardRequest = {},
  _authorization?: string | null,
): Promise<GenerateMoodboardResponse | NativeError> {
  const persona = await storePersonaDetail(personaId)
  if (!persona) return { error: 'Persona not found', status: 404 }
  const title = body.title?.trim() || `${persona.name} moodboard`
  const meta = nativeMeta('generateMoodboard', { personaId }, { title })
  const assist = await runAssistJson<{
    styleKeywords?: string[]
    tileCaptions?: string[]
  }>('moodboard.style_keywords', {
    locale: 'en',
    persona_profile: personaProfileText(persona),
    context: title,
  })
  if ('error' in assist) return assist
  const styleKeywords = uniqStrings(
    [
      ...(assist.data.styleKeywords ?? []),
      ...(persona.visuals?.styleKeywords ?? []),
      ...(persona.colorPalette ?? []),
    ],
    8,
  )
  const captions = assist.data.tileCaptions ?? [
    'Atmosphere',
    'Texture',
    'Interface cues',
    'Context space',
  ]
  const tileSlugs = ['tone-warm', 'material-soft', 'ui-calm', 'space-studio'] as const
  const candidates = tileSlugs.map((slug, i) => ({
    id: `mood-native-${personaId}-${i + 1}`,
    imageUrl: personaVisualPath(slug),
    category: slug.split('-')[0] ?? 'tone',
    caption: `${captions[i] ?? slug} · ${persona.name}`,
    locked: false as const,
  }))
  // Optional: generate one hero tile via Images API when available
  try {
    const client = createOpenAiClient()
    const image = await client.images.generate({
      model: getAiOpenAiImageModel(),
      prompt: `Abstract moodboard tile for ${persona.name}: ${styleKeywords.slice(0, 4).join(', ')}. No text.`,
      size: '1024x1024',
      n: 1,
    })
    const b64 = image.data?.[0]?.b64_json
    const url = image.data?.[0]?.url
    if (b64 || url) {
      candidates[0] = {
        ...candidates[0]!,
        imageUrl: b64 ? `data:image/png;base64,${b64}` : url!,
        caption: `Hero · ${persona.name}`,
      }
    }
  } catch {
    /* keep fixture tile paths if image gen fails */
  }
  const tiles = mergeMoodboardTiles(persona.visuals?.tiles ?? [], candidates)
  const visuals = { styleKeywords, tiles }
  const patched = await storePatchPersona(personaId, { visuals })
  if (!patched) return { error: 'Persona not found', status: 404 }
  return {
    ...meta,
    personaId,
    moodboardId: `moodboard-native-${personaId}-${Date.now().toString(36)}`,
    status: 'ready',
    visuals: patched.visuals ?? visuals,
  }
}

export async function runNativeResearchStart(
  projectId: string,
  body: ResearchStartRequest,
  _authorization?: string | null,
): Promise<ResearchStartResponse | NativeError> {
  const project = await storeProjectDetail(projectId)
  if (!project) return { error: 'Project not found', status: 404 }
  const seedUrl = String(body.seed_url ?? '').trim() || 'https://example.com'
  const upstreamBody = {
    seed_url: seedUrl,
    max_pages: body.max_pages ?? 20,
    max_depth: body.max_depth ?? 2,
  }
  const meta = nativeMeta('researchStart', { projectId }, upstreamBody)
  const jobId = storeCreateResearchRun(projectId, seedUrl, false)

  let packContext = ''
  const platformProjectId = project.platformProjectId?.trim()
  if (platformProjectId) {
    const { loadPackSeedForPlatformProject } = await import('./plexon-knowledge-pack')
    packContext = await loadPackSeedForPlatformProject(platformProjectId)
  }

  scheduleNativeResearchJob(jobId, projectId, seedUrl, packContext || undefined)
  return { ...meta, jobId, status: 'queued' }
}
