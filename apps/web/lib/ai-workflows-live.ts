/**
 * @deprecated V2 HTTP proxy runners — use ai-workflows-native.ts.
 * Kept for reference / emergency rollback only. Coolify v3 must not depend on these.
 */

import type {
  AiSuggestionItem,
  AiTargetCall,
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
} from './ai-workflows'
import { fetchChatApi, fetchPersonaApi } from './persona-api-proxy'
import { storeJourneyDetail, storePatchJourney } from './fixtures/journey-store'
import { storePatchPersona } from './fixtures/persona-store'

function liveMeta(
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function suggestionFromUnknown(item: unknown, index: number, prefix: string): AiSuggestionItem {
  const rec = asRecord(item)
  if (!rec) {
    return { id: `${prefix}-${index + 1}`, title: String(item) }
  }
  const title =
    (typeof rec.title === 'string' && rec.title) ||
    (typeof rec.name === 'string' && rec.name) ||
    (typeof rec.content === 'string' && rec.content) ||
    `Suggestion ${index + 1}`
  const subtitle =
    (typeof rec.subtitle === 'string' && rec.subtitle) ||
    (typeof rec.segment === 'string' && rec.segment) ||
    (typeof rec.headline === 'string' && rec.headline) ||
    (typeof rec.age === 'string' && rec.age) ||
    null
  const description =
    (typeof rec.description === 'string' && rec.description) ||
    (typeof rec.bio === 'string' && rec.bio) ||
    (typeof rec.content === 'string' && rec.content !== title ? rec.content : null) ||
    null
  return {
    id: typeof rec.id === 'string' ? rec.id : `${prefix}-${index + 1}`,
    title,
    subtitle,
    description,
  }
}

export type LiveError = { error: string; status: number; detail?: string }

export async function runLiveGeneratePersonas(
  tgId: string,
  body: GeneratePersonasRequest,
  authorization?: string | null,
): Promise<GeneratePersonasResponse | LiveError> {
  const upstreamBody = {
    segment: body.segment?.trim() || 'General',
    description: body.description ?? undefined,
    filter_mode: body.filter_mode ?? 'auto',
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.generatePersonas.upstreamPath, { tgId })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const persona = asRecord(res.json)
  if (!persona?.id) {
    return { error: 'Unexpected generate personas response', status: 502 }
  }
  const meta = liveMeta('generatePersonas', { tgId }, upstreamBody)
  return {
    ...meta,
    personas: [
      {
        id: String(persona.id),
        name: String(persona.name ?? 'Persona'),
        role: String(persona.headline ?? persona.segment ?? ''),
      },
    ],
  }
}

export async function runLiveSuggestTargetGroups(
  projectId: string,
  body: SuggestTargetGroupsRequest,
  authorization?: string | null,
): Promise<SuggestTargetGroupsResponse | LiveError> {
  const upstreamBody = {
    max_suggestions: body.max_suggestions ?? 5,
    output_locale: body.output_locale ?? 'en',
    bilingual: body.bilingual ?? false,
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.suggestTargetGroups.upstreamPath, {
    projectId,
  })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const raw = Array.isArray(json?.suggestions) ? json.suggestions : []
  const meta = liveMeta('suggestTargetGroups', { projectId }, upstreamBody)
  return {
    ...meta,
    suggestions: raw.map((item, i) => suggestionFromUnknown(item, i, `live-tg-${projectId}`)),
  }
}

export async function runLiveSuggestPersonas(
  projectId: string,
  body: SuggestPersonasRequest,
  authorization?: string | null,
): Promise<SuggestPersonasResponse | LiveError> {
  const tgId = body.target_group_id
  const upstreamBody = {
    max_suggestions: body.max_suggestions ?? 5,
    output_locale: body.output_locale ?? 'en',
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.suggestPersonas.upstreamPath, { tgId })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const raw = Array.isArray(json?.suggestions) ? json.suggestions : []
  const meta = liveMeta('suggestPersonas', { tgId }, upstreamBody)
  return {
    ...meta,
    suggestions: raw.map((item, i) => suggestionFromUnknown(item, i, `live-persona-${tgId}`)),
  }
}

export async function runLiveResearchStart(
  projectId: string,
  body: ResearchStartRequest,
  authorization?: string | null,
): Promise<ResearchStartResponse | LiveError> {
  const upstreamBody = {
    seed_url: body.seed_url ?? '',
    max_pages: body.max_pages ?? 20,
    max_depth: body.max_depth ?? 2,
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.researchStart.upstreamPath, { projectId })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const jobId = String(json?.id ?? json?.job_id ?? json?.run_id ?? '')
  if (!jobId) return { error: 'Unexpected research start response', status: 502 }
  const statusRaw = String(json?.status ?? 'queued')
  const status =
    statusRaw === 'running' || statusRaw === 'idle' || statusRaw === 'queued'
      ? statusRaw
      : 'queued'
  const meta = liveMeta('researchStart', { projectId }, upstreamBody)
  return { ...meta, jobId, status }
}

export async function runLiveGenerateJourney(
  body: GenerateJourneyRequest,
  fromProjectId?: string,
  authorization?: string | null,
): Promise<GenerateJourneyResponse | LiveError> {
  const projectId = fromProjectId ?? body.project_id ?? null
  const upstreamBody = {
    target_group_id: body.target_group_id,
    journey_type: body.journey_type?.trim() || 'customer',
    organization_id: body.organization_id ?? undefined,
    project_id: projectId,
    output_locale: body.output_locale ?? 'en',
    use_async: body.use_async ?? false,
  }
  const workflowId = fromProjectId ? 'generateJourneyFromProject' : 'generateJourney'
  const pathParams: Record<string, string> = fromProjectId ? { projectId: fromProjectId } : {}
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS[workflowId].upstreamPath, pathParams)
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  if (!json?.id) return { error: 'Unexpected journey generate response', status: 502 }
  const phases = Array.isArray(json.phases) ? json.phases : []
  const meta = liveMeta(workflowId, pathParams, upstreamBody as Record<string, unknown>)
  return {
    ...meta,
    journey: {
      id: String(json.id),
      name: String(json.name ?? 'Journey'),
      phaseCount: phases.length || Number(json.phase_count ?? json.phaseCount ?? 0),
    },
  }
}

export async function runLiveGeneratePersonaAvatar(
  personaId: string,
  body: GeneratePersonaAvatarRequest = {},
  authorization?: string | null,
): Promise<GeneratePersonaAvatarResponse | LiveError> {
  const upstreamBody = { style: body.style?.trim() || undefined }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.generatePersonaAvatar.upstreamPath, {
    personaId,
  })
  const res = await fetchChatApi(path, { body: upstreamBody, authorization })
  if ('error' in res) return { error: res.error, status: res.status, detail: res.detail }
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    return { error: 'Invalid avatar response', status: 502 }
  }
  if (!res.ok) {
    const rec = asRecord(json)
    return {
      error: String(rec?.detail ?? rec?.error ?? `Upstream ${res.status}`),
      status: res.status,
    }
  }
  const rec = asRecord(json)
  const avatarUrl = String(rec?.image_url ?? rec?.avatarUrl ?? rec?.url ?? '')
  if (!avatarUrl) return { error: 'No image_url in avatar response', status: 502 }

  // Keep fixture magazine in sync when demo personas are used locally.
  storePatchPersona(personaId, { avatarUrl })

  const meta = liveMeta('generatePersonaAvatar', { personaId }, upstreamBody)
  return { ...meta, avatarUrl }
}

export async function runLiveSuggestPersonaField(
  personaId: string,
  body: SuggestPersonaFieldRequest,
  authorization?: string | null,
): Promise<SuggestPersonaFieldResponse | LiveError> {
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
  const path = formatUpstreamPath(upstream.path, { personaId })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const raw = Array.isArray(json?.suggestions) ? json.suggestions : []
  const suggestions = raw.map((item, i) => {
    const mapped = suggestionFromUnknown(item, i, `live-${field}-${personaId}`)
    const rec = asRecord(item)
    // AiAssist uses `content` as primary text
    if (rec && typeof rec.content === 'string' && !rec.title && !rec.name) {
      return { ...mapped, title: rec.content }
    }
    return mapped
  })

  return {
    stubbed: false,
    workflowId: 'suggestPersonaField',
    target: { method: 'POST', path, body: upstreamBody },
    field,
    suggestions,
  }
}

function listFromProfile(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') return item
      const rec = asRecord(item)
      if (!rec) return ''
      return String(rec.label ?? rec.content ?? rec.title ?? rec.name ?? '')
    })
    .filter(Boolean)
}

export async function runLiveEnrichPersona(
  personaId: string,
  body: EnrichPersonaRequest = {},
  authorization?: string | null,
): Promise<EnrichPersonaResponse | LiveError> {
  const upstreamBody: Record<string, unknown> = {
    output_locale: body.output_locale ?? 'en',
    profile_overlay: body.profile_overlay ?? undefined,
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.enrichPersona.upstreamPath, { personaId })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const profile = asRecord(json?.profile) ?? asRecord(json) ?? {}
  const interests = listFromProfile(profile.interests)
  const values = listFromProfile(profile.values)
  const goalsRaw = Array.isArray(profile.goals) ? profile.goals : []
  const goals = goalsRaw.map((g, i) => {
    const rec = asRecord(g)
    return {
      label: String(rec?.label ?? rec?.content ?? g ?? `Goal ${i + 1}`),
      priority: typeof rec?.priority === 'number' ? rec.priority : i + 1,
    }
  })
  const pain = listFromProfile(profile.pain_points ?? profile.painPoints)
  const frustrations = pain.map((label) => ({ label, evidenceCount: 1 }))
  const traitsRaw = asRecord(profile.traits) ?? {}
  const traits: Record<string, number> = {}
  for (const [k, v] of Object.entries(traitsRaw)) {
    if (typeof v === 'number') traits[k] = v
    else if (typeof v === 'string' && !Number.isNaN(Number(v))) traits[k] = Number(v)
    else traits[k] = 1
  }

  // Keep magazine fixtures in sync when the id exists locally.
  storePatchPersona(personaId, {
    interests: interests.length ? interests : undefined,
    values: values.length ? values : undefined,
    goals: goals.length ? goals : undefined,
    frustrations: frustrations.length ? frustrations : undefined,
    traits: Object.keys(traits).length ? traits : undefined,
  })

  const meta = liveMeta('enrichPersona', { personaId }, upstreamBody)
  return {
    ...meta,
    personaId,
    facetsUpdated: ['interests', 'values', 'goals', 'frustrations', 'traits'].filter((f) => {
      if (f === 'interests') return interests.length > 0
      if (f === 'values') return values.length > 0
      if (f === 'goals') return goals.length > 0
      if (f === 'frustrations') return frustrations.length > 0
      return Object.keys(traits).length > 0
    }),
    interests,
    values,
    goals,
    frustrations,
    traits,
  }
}

export async function runLiveGenerateMoodboard(
  personaId: string,
  body: GenerateMoodboardRequest = {},
  authorization?: string | null,
): Promise<GenerateMoodboardResponse | LiveError> {
  const upstreamBody = { title: body.title?.trim() || undefined }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.generateMoodboard.upstreamPath, {
    personaId,
  })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const moodboard = asRecord(json?.moodboard) ?? json
  const moodboardId = moodboard?.id ? String(moodboard.id) : null
  const styleKeywords = Array.isArray(moodboard?.styleKeywords)
    ? (moodboard!.styleKeywords as unknown[]).map(String)
    : Array.isArray(moodboard?.style_keywords)
      ? (moodboard!.style_keywords as unknown[]).map(String)
      : []
  const rawTiles = Array.isArray(moodboard?.tiles) ? moodboard!.tiles : []
  const tiles = rawTiles.map((tile, i) => {
    const rec = asRecord(tile)
    return {
      id: String(rec?.id ?? `tile-${i + 1}`),
      imageUrl: String(rec?.imageUrl ?? rec?.image_url ?? ''),
      category: String(rec?.category ?? 'visual'),
      caption: rec?.caption != null ? String(rec.caption) : null,
    }
  }).filter((t) => t.imageUrl)

  const visuals = {
    styleKeywords: styleKeywords.filter(Boolean),
    tiles,
  }
  if (visuals.styleKeywords.length || visuals.tiles.length) {
    storePatchPersona(personaId, { visuals })
  }

  const statusRaw = String(moodboard?.status ?? 'building')
  const status =
    statusRaw === 'ready' || statusRaw === 'published' ? 'ready' : 'building'

  const meta = liveMeta('generateMoodboard', { personaId }, upstreamBody)
  return {
    ...meta,
    personaId,
    moodboardId,
    status,
    visuals,
  }
}

const KIND_SET = new Set<JourneyElementKind>([
  'action',
  'thought',
  'feeling',
  'pain',
  'opportunity',
  'other',
])

function asElementKind(raw: unknown): JourneyElementKind {
  const s = String(raw ?? 'action').toLowerCase()
  if (KIND_SET.has(s as JourneyElementKind)) return s as JourneyElementKind
  if (s.includes('pain')) return 'pain'
  if (s.includes('thought') || s.includes('question')) return 'thought'
  if (s.includes('feel') || s.includes('emotion')) return 'feeling'
  if (s.includes('opport')) return 'opportunity'
  return 'action'
}

export async function runLiveGenerateJourneyPhaseMoments(
  journeyId: string,
  body: GenerateJourneyPhaseMomentsRequest,
  authorization?: string | null,
): Promise<GenerateJourneyPhaseMomentsResponse | LiveError> {
  if (!body.phase_id) return { error: 'phase_id is required', status: 400 }

  const local = storeJourneyDetail(journeyId)
  const phase = local?.phases.find((p) => p.id === body.phase_id)

  const upstreamBody: Record<string, unknown> = {
    template_id: 'journey.moments',
    phase_id: body.phase_id,
    max_suggestions: body.max_suggestions ?? 4,
    output_locale: body.output_locale ?? 'en',
    phase_context: {
      phase_name: phase?.name,
      phase_summary: phase?.summary,
    },
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.generateJourneyPhaseMoments.upstreamPath, {
    journeyId,
  })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const raw = Array.isArray(json?.suggestions) ? json!.suggestions : []
  const suggestions = raw
    .map((item, i) => {
      const rec = asRecord(item)
      const label = String(rec?.content ?? rec?.title ?? '').trim()
      if (!label) return null
      return {
        id: `el-live-${i + 1}`,
        kind: asElementKind(rec?.element_type ?? rec?.type),
        label,
        order: i,
      }
    })
    .filter((m): m is NonNullable<typeof m> => m != null)

  let applied = false
  let moments = suggestions

  if (local && phase && suggestions.length) {
    const existingLabels = new Set(phase.elements.map((el) => el.label.toLowerCase()))
    const fresh = suggestions.filter((s) => !existingLabels.has(s.label.toLowerCase()))
    const startOrder = phase.elements.length
    const merged = [
      ...phase.elements,
      ...fresh.map((s, i) => ({ ...s, order: startOrder + i })),
    ].map((el, order) => ({ ...el, order }))
    const phases = local.phases.map((p) =>
      p.id === phase.id ? { ...p, elements: merged } : p,
    )
    const patched = storePatchJourney(journeyId, {
      name: local.name,
      journeyType: local.journeyType,
      status: local.status,
      description: local.description,
      targetGroupId: local.targetGroupId,
      projectId: local.projectId,
      phases,
    })
    if (patched) {
      applied = true
      moments = patched.phases.find((p) => p.id === phase.id)?.elements ?? merged
    }
  }

  const meta = liveMeta('generateJourneyPhaseMoments', { journeyId }, upstreamBody)
  return {
    ...meta,
    journeyId,
    phaseId: body.phase_id,
    applied,
    moments,
  }
}

export async function runLiveValidateJourney(
  journeyId: string,
  body: ValidateJourneyRequest,
  authorization?: string | null,
): Promise<ValidateJourneyResponse | LiveError> {
  const personaIds = body.persona_ids?.filter(Boolean) ?? []
  if (!personaIds.length) return { error: 'At least one persona_id required', status: 400 }

  const upstreamBody: Record<string, unknown> = {
    persona_ids: personaIds,
    mode: body.mode ?? 'automated',
  }
  const path = formatUpstreamPath(AI_WORKFLOW_TARGETS.validateJourney.upstreamPath, { journeyId })
  const res = await fetchPersonaApi(path, { body: upstreamBody, authorization })
  if (!res.ok) return { error: res.error, status: res.status, detail: res.detail }

  const json = asRecord(res.json)
  const rawPhases = Array.isArray(json?.phases) ? json!.phases : []
  const phases = rawPhases.map((item) => {
    const rec = asRecord(item)
    const frictions = Array.isArray(rec?.friction_points)
      ? rec!.friction_points
      : Array.isArray(rec?.frictionPoints)
        ? rec!.frictionPoints
        : []
    return {
      phaseId: String(rec?.phase_id ?? rec?.phaseId ?? ''),
      phaseName: String(rec?.phase_name ?? rec?.phaseName ?? ''),
      fitScore: Number(rec?.fit_score ?? rec?.fitScore ?? 0),
      status: (String(rec?.status ?? 'warning') as 'good' | 'warning' | 'critical') || 'warning',
      frictionPoints: frictions.map((fp) => {
        const f = asRecord(fp)
        return {
          description: String(f?.description ?? ''),
          severity: (String(f?.severity ?? 'medium') as 'low' | 'medium' | 'high') || 'medium',
          personaQuote:
            f?.persona_quote != null
              ? String(f.persona_quote)
              : f?.personaQuote != null
                ? String(f.personaQuote)
                : null,
        }
      }),
      recommendations: Array.isArray(rec?.recommendations)
        ? (rec!.recommendations as unknown[]).map(String)
        : [],
    }
  })

  const meta = liveMeta('validateJourney', { journeyId }, upstreamBody)
  return {
    ...meta,
    journeyId,
    overallFitScore: Number(json?.overall_fit_score ?? json?.overallFitScore ?? 0),
    validatedAt: String(json?.validated_at ?? json?.validatedAt ?? new Date().toISOString()),
    personaId: personaIds[0]!,
    phases,
  }
}
