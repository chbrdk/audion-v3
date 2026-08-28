#!/usr/bin/env node
/**
 * Migrate one AUDION-v2 project (+ TGs + personas + knowledge text) → v3 suite.
 *
 * Canonical order (collection-projects.md 1A):
 *   1) Create (or reuse) Collection in plexon-v3 under a v3 company
 *   2) Plexon syncs capability mirrors (audion / checkion / …)
 *   3) Fill AUDION content into the synced audion externalProjectId (PATCH + POST children)
 *
 * Does NOT use Easy Setup. Does NOT create an Audion-first project then sync-plexon.
 * Legacy Plexon/CHECKION UUIDs are reference-only — they do not exist on v3 islands.
 *
 * Env (never commit secrets):
 *   AUDION_V2_API_URL       — FastAPI base (no trailing slash) — NOT the web URL
 *   AUDION_V2_API_TOKEN     — Bearer audion_… for V2
 *   AUDION_V3_BASE_URL      — default https://audion-v3.projects-a.plygrnd.tech
 *   AUDION_API_TOKEN        — Bearer audion_… for V3 BFF (write)
 *   PLEXON_BASE_URL         — default https://plexon-v3.projects-a.plygrnd.tech
 *   PLEXON_API_TOKEN        — Bearer plexon_<64-hex> (Settings → API); skip if TARGET_AUDION_PROJECT_ID set
 *   SOURCE_PROJECT_ID       — V2 Audion project UUID (required)
 *   PLATFORM_COMPANY_ID     — plexon-v3 company UUID (required to create Collection)
 *   PLATFORM_PROJECT_ID     — optional existing plexon-v3 Collection (skip create)
 *   TARGET_AUDION_PROJECT_ID — optional: fill this Audion mirror directly (skip Plexon API)
 *   COLLECTION_NAME         — optional override (default = V2 project name)
 *   COLLECTION_DOMAIN       — optional domain on Collection create
 *   DRY_RUN                 — default 1
 *   INCLUDE_JOURNEYS        — default 0
 *   OUT_DIR                 — default ./tmp/migrate-v2-v3
 *
 * Legacy reference only (ignored for writes):
 *   LEGACY_PLATFORM_PROJECT_ID / LEGACY_CHECKION_PROJECT_ID
 *
 * Example:
 *   DRY_RUN=0 SOURCE_PROJECT_ID=361f189a-… \
 *     PLATFORM_COMPANY_ID=<v3-company-uuid> \
 *     AUDION_V2_API_URL=… AUDION_V2_API_TOKEN=… \
 *     AUDION_API_TOKEN=… PLEXON_API_TOKEN=… \
 *     node scripts/migrate-project-v2-to-v3.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const AUDION_V3_DEFAULT = 'https://audion-v3.projects-a.plygrnd.tech'
const PLEXON_V3_DEFAULT = 'https://plexon-v3.projects-a.plygrnd.tech'

const v2Base = (process.env.AUDION_V2_API_URL || '').replace(/\/$/, '')
const v2Token = process.env.AUDION_V2_API_TOKEN?.trim()
const v3Base = (process.env.AUDION_V3_BASE_URL || AUDION_V3_DEFAULT).replace(/\/$/, '')
const v3Token = process.env.AUDION_API_TOKEN?.trim()
const plexonBase = (process.env.PLEXON_BASE_URL || PLEXON_V3_DEFAULT).replace(/\/$/, '')
const plexonToken = process.env.PLEXON_API_TOKEN?.trim()
const sourceProjectId = process.env.SOURCE_PROJECT_ID?.trim()
const platformCompanyId = process.env.PLATFORM_COMPANY_ID?.trim() || null
const existingPlatformProjectId = process.env.PLATFORM_PROJECT_ID?.trim() || null
const targetAudionProjectId = process.env.TARGET_AUDION_PROJECT_ID?.trim() || null
const collectionNameOverride = process.env.COLLECTION_NAME?.trim() || null
const collectionDomain = process.env.COLLECTION_DOMAIN?.trim() || null
const dryRun = (process.env.DRY_RUN ?? '1') !== '0'
const includeJourneys = process.env.INCLUDE_JOURNEYS === '1'
const outDir = process.env.OUT_DIR || join(process.cwd(), 'tmp', 'migrate-v2-v3')

const legacyPlatformProjectId =
  process.env.LEGACY_PLATFORM_PROJECT_ID?.trim() || null
const legacyCheckionProjectId =
  process.env.LEGACY_CHECKION_PROJECT_ID?.trim() || null

function die(msg) {
  console.error(msg)
  process.exit(1)
}

if (!sourceProjectId) die('Missing SOURCE_PROJECT_ID')
if (!v2Base) die('Missing AUDION_V2_API_URL (FastAPI base, not the web app)')
if (!v2Token) die('Missing AUDION_V2_API_TOKEN')
if (!dryRun) {
  if (!v3Token) die('Missing AUDION_API_TOKEN (required when DRY_RUN=0)')
  if (targetAudionProjectId) {
    /* Plexon optional — Collection already provisioned; fill Audion mirror directly */
  } else {
    if (!plexonToken) die('Missing PLEXON_API_TOKEN (or set TARGET_AUDION_PROJECT_ID)')
    if (!existingPlatformProjectId && !platformCompanyId) {
      die(
        'Missing PLATFORM_COMPANY_ID (plexon-v3 company) or PLATFORM_PROJECT_ID (existing Collection)',
      )
    }
  }
}

const v2Headers = {
  Authorization: `Bearer ${v2Token}`,
  Accept: 'application/json',
}
const v3Headers = {
  Authorization: `Bearer ${v3Token || ''}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
}
const plexonHeaders = {
  Authorization: `Bearer ${plexonToken || ''}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function req(base, headers, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text?.slice(0, 500) }
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`)
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

const v2 = (method, path, body) => req(v2Base, v2Headers, method, path, body)
const v3 = (method, path, body) => req(v3Base, v3Headers, method, path, body)
const plexon = (method, path, body) =>
  req(plexonBase, plexonHeaders, method, path, body)

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  if (payload && Array.isArray(payload.results)) return payload.results
  return []
}

function str(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function stringList(v) {
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
}

function goals(v) {
  if (!Array.isArray(v)) return []
  return v
    .map((g, i) => {
      if (typeof g === 'string') return { label: g, priority: i }
      if (g && typeof g === 'object' && typeof g.label === 'string') {
        return { label: g.label, priority: typeof g.priority === 'number' ? g.priority : i }
      }
      return null
    })
    .filter(Boolean)
}

function frustrations(v) {
  if (!Array.isArray(v)) return []
  return v
    .map((f) => {
      if (typeof f === 'string') return { label: f, evidenceCount: 0 }
      if (f && typeof f === 'object' && typeof f.label === 'string') {
        return {
          label: f.label,
          evidenceCount: typeof f.evidenceCount === 'number' ? f.evidenceCount : 0,
        }
      }
      return null
    })
    .filter(Boolean)
}

function motivations(v) {
  if (!Array.isArray(v)) return []
  return v
    .map((m) => {
      if (typeof m === 'string') return { label: m, type: null }
      if (m && typeof m === 'object' && typeof m.label === 'string') {
        return {
          label: m.label,
          type: m.type === 'intrinsic' || m.type === 'extrinsic' ? m.type : null,
        }
      }
      return null
    })
    .filter(Boolean)
}

function traits(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out = {}
  for (const [k, raw] of Object.entries(v)) {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (k.trim() && Number.isFinite(n)) out[k] = Math.min(1, Math.max(0, n))
  }
  return out
}

function pickProfile(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const root = raw
  const profile =
    root.profile && typeof root.profile === 'object' && !Array.isArray(root.profile)
      ? root.profile
      : {}
  return { ...root, ...profile }
}

function mapAudionPatch(v2Project, researchLatest) {
  const name = str(v2Project.name) || 'Migrated project'
  const companyContext =
    str(v2Project.company_context) ||
    str(v2Project.companyContext) ||
    str(researchLatest?.summary) ||
    str(researchLatest?.text) ||
    null
  const chapters = []
  if (companyContext) {
    chapters.push({ id: 'ch-company', title: 'Brief', body: companyContext })
  }
  const researchBody =
    str(researchLatest?.markdown) ||
    str(researchLatest?.summary) ||
    str(researchLatest?.text) ||
    null
  if (researchBody && researchBody !== companyContext) {
    chapters.push({ id: 'ch-research', title: 'Research (imported)', body: researchBody })
  }
  const statusRaw = str(v2Project.status) || 'published'
  const status =
    statusRaw === 'draft' || statusRaw === 'archived' || statusRaw === 'published'
      ? statusRaw
      : statusRaw === 'active'
        ? 'published'
        : 'published'

  return {
    name,
    nameDe: str(v2Project.name_de) || str(v2Project.nameDe),
    description: str(v2Project.description),
    companyContext,
    knowledgeChapters: chapters,
    status,
  }
}

function mapPersona(raw, projectId) {
  const p = pickProfile(raw)
  const name = str(p.name)
  if (!name) return null
  const statusRaw = str(p.status) || 'ready'
  const status = statusRaw === 'draft' || statusRaw === 'archived' ? statusRaw : 'ready'
  const comm = p.communication_style || p.communicationStyle
  let communicationStyle = null
  if (comm && typeof comm === 'object') {
    communicationStyle = {
      vocabulary: stringList(comm.vocabulary),
      sentenceStructure: str(comm.sentence_structure) || str(comm.sentenceStructure),
      skepticismLevel: num(comm.skepticism_level) ?? num(comm.skepticismLevel),
    }
  }
  return {
    name,
    role: str(p.role) || str(p.job_title) || str(p.headline) || 'Persona',
    status,
    archetype: str(p.archetype),
    age:
      str(p.age) ||
      (typeof p.age === 'number' ? String(p.age) : null) ||
      str(p.age_label),
    location: str(p.location),
    bio: str(p.bio) || str(p.description) || str(p.headline),
    gender: str(p.gender),
    attentionSpan: str(p.attention_span) || str(p.attentionSpan),
    mediaAffinity: num(p.media_affinity) ?? num(p.mediaAffinity),
    confidence: num(p.confidence),
    techLiteracy: num(p.tech_literacy) ?? num(p.techLiteracy),
    emotionalBaseline: str(p.emotional_baseline) || str(p.emotionalBaseline),
    stressTriggers: stringList(p.stress_triggers || p.stressTriggers),
    motivations: motivations(p.motivations),
    traits: traits(p.traits),
    interests: stringList(p.interests),
    values: stringList(p.values),
    socialMediaUsage: stringList(p.social_media_usage || p.socialMediaUsage),
    communicationStyle,
    goals: goals(p.goals),
    frustrations: frustrations(p.frustrations || p.pain_points),
    channels: stringList(p.channels),
    avatarUrl: str(p.avatar_url) || str(p.avatarUrl) || str(p.image_url) || str(p.imageUrl),
    headlineDe: str(p.headline_de) || str(p.headlineDe),
    projectId,
    knowledgeEntries: Array.isArray(p.knowledge)
      ? p.knowledge
      : Array.isArray(p.knowledge_entries)
        ? p.knowledge_entries
        : [],
  }
}

function mapTargetGroup(raw, projectId, linkedPersonaIds) {
  const name = str(raw.name)
  if (!name) return null
  const statusRaw = str(raw.status) || 'active'
  const status =
    statusRaw === 'archived' || statusRaw === 'draft' || statusRaw === 'active'
      ? statusRaw
      : 'active'
  return {
    name,
    segment: str(raw.segment) || str(raw.audience) || 'Segment',
    description: str(raw.description) || str(raw.brief),
    status,
    projectId,
    linkedPersonaIds,
    knowledgeEntries: Array.isArray(raw.knowledgeEntries)
      ? raw.knowledgeEntries
      : Array.isArray(raw.knowledge)
        ? raw.knowledge
        : [],
  }
}

function mapJourney(raw, projectId, targetGroupId) {
  const name = str(raw.name)
  if (!name) return null
  const phases = Array.isArray(raw.phases)
    ? raw.phases.map((ph, i) => ({
        id: str(ph.id) || `phase-${i + 1}`,
        name: str(ph.name) || `Phase ${i + 1}`,
        summary: str(ph.summary) || str(ph.focus) || '',
        elements: Array.isArray(ph.elements)
          ? ph.elements.map((el, j) => ({
              id: str(el.id) || `el-${i}-${j}`,
              kind: str(el.kind) || 'moment',
              label: str(el.label) || str(el.name) || `Moment ${j + 1}`,
            }))
          : [],
      }))
    : []
  return {
    name,
    description: str(raw.description),
    journeyType: str(raw.journey_type) || str(raw.journeyType) || 'journey',
    status: str(raw.status) === 'archived' ? 'archived' : 'draft',
    projectId,
    targetGroupId,
    phases,
  }
}

function externalIdFromSyncResults(syncResults, productId) {
  if (!Array.isArray(syncResults)) return null
  const hit = syncResults.find((r) => r && r.productId === productId && r.ok)
  return str(hit?.externalProjectId) || null
}

function externalIdFromBindings(bindings, productId) {
  if (!Array.isArray(bindings)) return null
  const hit = bindings.find((b) => b && (b.productId === productId || b.product_id === productId))
  return str(hit?.externalProjectId) || str(hit?.external_project_id) || null
}

function resolveMirrors({ syncResults, dashboard }) {
  const fromSync = {
    audion: externalIdFromSyncResults(syncResults, 'audion'),
    checkion: externalIdFromSyncResults(syncResults, 'checkion'),
    brandion: externalIdFromSyncResults(syncResults, 'brandion'),
    creation: externalIdFromSyncResults(syncResults, 'creation'),
    spirion: externalIdFromSyncResults(syncResults, 'spirion'),
  }
  const bindings = dashboard?.bindings
  const fromDash = {
    audion:
      str(dashboard?.audion?.externalProjectId) ||
      externalIdFromBindings(bindings, 'audion'),
    checkion:
      str(dashboard?.checkion?.externalProjectId) ||
      externalIdFromBindings(bindings, 'checkion'),
    brandion:
      str(dashboard?.brandion?.externalProjectId) ||
      externalIdFromBindings(bindings, 'brandion'),
    creation:
      str(dashboard?.creation?.externalProjectId) ||
      externalIdFromBindings(bindings, 'creation'),
    spirion:
      str(dashboard?.spirion?.externalProjectId) ||
      externalIdFromBindings(bindings, 'spirion'),
  }
  return {
    audion: fromSync.audion || fromDash.audion,
    checkion: fromSync.checkion || fromDash.checkion,
    brandion: fromSync.brandion || fromDash.brandion,
    creation: fromSync.creation || fromDash.creation,
    spirion: fromSync.spirion || fromDash.spirion,
  }
}

async function ensureCollection({ name, domain }) {
  if (targetAudionProjectId) {
    console.log(
      `Using TARGET_AUDION_PROJECT_ID=${targetAudionProjectId} (skip Plexon API)`,
    )
    return {
      platformProjectId: existingPlatformProjectId,
      created: false,
      syncResults: null,
      dashboard: null,
      mirrors: {
        audion: targetAudionProjectId,
        checkion: null,
        brandion: null,
        creation: null,
        spirion: null,
      },
    }
  }

  let platformProjectId = existingPlatformProjectId
  let created = false
  let syncResults = null

  if (platformProjectId) {
    console.log(`Reusing Collection ${platformProjectId}`)
    const synced = await plexon(
      'POST',
      `/api/platform/projects/${encodeURIComponent(platformProjectId)}/sync`,
    )
    syncResults = synced?.results ?? null
  } else {
    console.log(
      `Creating Collection under company ${platformCompanyId}: ${name}`,
    )
    const body = { name }
    if (domain) body.domain = domain
    const createdRow = await plexon(
      'POST',
      `/api/platform/companies/${encodeURIComponent(platformCompanyId)}/platform-projects`,
      body,
    )
    platformProjectId = str(createdRow?.id)
    if (!platformProjectId) {
      die('Plexon create returned no Collection id')
    }
    created = true
    syncResults = createdRow?.syncResults ?? null
    console.log(`Created Collection ${platformProjectId}`)
  }

  const dashboard = await plexon(
    'GET',
    `/api/platform/projects/${encodeURIComponent(platformProjectId)}/dashboard`,
  )
  const mirrors = resolveMirrors({ syncResults, dashboard })
  if (!mirrors.audion) {
    die(
      `No audion mirror for Collection ${platformProjectId}. Check plexon↔audion federation / syncResults.`,
    )
  }
  return { platformProjectId, created, syncResults, dashboard, mirrors }
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  console.log(`Source project: ${sourceProjectId}`)
  console.log(`V2 API: ${v2Base}`)
  console.log(`Plexon: ${plexonBase}`)
  console.log(`Audion v3: ${v3Base}`)
  console.log(`Mode: ${dryRun ? 'DRY_RUN' : 'WRITE (Plexon-first)'}`)
  if (legacyPlatformProjectId || legacyCheckionProjectId) {
    console.log(
      'Legacy IDs are reference-only (not stamped):',
      { legacyPlatformProjectId, legacyCheckionProjectId },
    )
  }

  if (!dryRun) {
    await v3('POST', '/api/settings/tokens/verify')
    console.log('Audion v3 token verified')
  }

  const v2Project = await v2('GET', `/projects/${encodeURIComponent(sourceProjectId)}`)
  let researchLatest = null
  try {
    researchLatest = await v2(
      'GET',
      `/projects/${encodeURIComponent(sourceProjectId)}/research/latest`,
    )
  } catch (e) {
    console.warn(`Research latest skipped (${e.status || e.message})`)
  }

  const audionPatch = mapAudionPatch(v2Project, researchLatest)
  const collectionName = collectionNameOverride || audionPatch.name

  // Personas
  let personaRows = []
  try {
    const listed = await v2(
      'GET',
      `/personas?project_id=${encodeURIComponent(sourceProjectId)}&limit=200`,
    )
    personaRows = asList(listed)
  } catch {
    const listed = await v2('GET', `/personas?limit=200`)
    personaRows = asList(listed).filter(
      (p) =>
        str(p.project_id) === sourceProjectId || str(p.projectId) === sourceProjectId,
    )
  }

  const personaDetails = []
  for (const row of personaRows) {
    const id = str(row.id) || str(row.persona_id)
    if (!id) continue
    try {
      const detail = await v2('GET', `/personas/${encodeURIComponent(id)}`)
      personaDetails.push({ v2Id: id, detail })
    } catch (e) {
      console.warn(`Persona ${id} detail failed (${e.status || e.message}); using list row`)
      personaDetails.push({ v2Id: id, detail: row })
    }
  }

  // Target groups
  let tgRows = []
  try {
    const listed = await v2(
      'GET',
      `/target-groups?project_id=${encodeURIComponent(sourceProjectId)}&limit=200`,
    )
    tgRows = asList(listed)
  } catch {
    const listed = await v2('GET', `/target-groups?limit=200`)
    tgRows = asList(listed).filter(
      (tg) =>
        str(tg.project_id) === sourceProjectId || str(tg.projectId) === sourceProjectId,
    )
  }

  const tgDetails = []
  for (const row of tgRows) {
    const id = str(row.id)
    if (!id) continue
    let detail = row
    try {
      detail = await v2('GET', `/target-groups/${encodeURIComponent(id)}`)
    } catch {
      /* list row */
    }
    let knowledge = []
    try {
      const kn = await v2('GET', `/target-groups/${encodeURIComponent(id)}/knowledge`)
      knowledge = asList(kn)
    } catch {
      /* optional */
    }
    let linkedIds = []
    try {
      const linked = await v2('GET', `/target-groups/${encodeURIComponent(id)}/personas`)
      linkedIds = asList(linked)
        .map((p) => str(p.id) || str(p.persona_id))
        .filter(Boolean)
    } catch {
      if (Array.isArray(detail.persona_ids)) linkedIds = detail.persona_ids.filter(Boolean)
      if (Array.isArray(detail.linked_persona_ids))
        linkedIds = detail.linked_persona_ids.filter(Boolean)
    }
    tgDetails.push({
      v2Id: id,
      detail: { ...detail, knowledge },
      linkedV2PersonaIds: linkedIds,
    })
  }

  let journeyDetails = []
  if (includeJourneys) {
    try {
      const listed = await v2(
        'GET',
        `/journeys?project_id=${encodeURIComponent(sourceProjectId)}&limit=100`,
      )
      for (const row of asList(listed)) {
        const id = str(row.id)
        if (!id) continue
        try {
          const detail = await v2('GET', `/journeys/${encodeURIComponent(id)}`)
          journeyDetails.push({ v2Id: id, detail })
        } catch {
          journeyDetails.push({ v2Id: id, detail: row })
        }
      }
    } catch (e) {
      console.warn(`Journeys skipped (${e.status || e.message})`)
    }
  }

  const plan = {
    mode: 'plexon-first',
    source: {
      audionProjectId: sourceProjectId,
      legacyPlatformProjectId,
      legacyCheckionProjectId,
      name: audionPatch.name,
    },
    plexon: {
      base: plexonBase,
      companyId: platformCompanyId,
      existingCollectionId: existingPlatformProjectId,
      collectionName,
      collectionDomain,
    },
    counts: {
      personas: personaDetails.length,
      targetGroups: tgDetails.length,
      journeys: journeyDetails.length,
      knowledgeChapters: audionPatch.knowledgeChapters.length,
    },
    audionPatch,
    personas: personaDetails.map((p) => ({
      v2Id: p.v2Id,
      name: str(pickProfile(p.detail).name),
    })),
    targetGroups: tgDetails.map((tg) => ({
      v2Id: tg.v2Id,
      name: str(tg.detail.name),
      linkedCount: tg.linkedV2PersonaIds.length,
    })),
    steps: [
      existingPlatformProjectId
        ? `Reuse Collection ${existingPlatformProjectId} + sync mirrors`
        : `POST Collection under company ${platformCompanyId || '(set PLATFORM_COMPANY_ID)'}`,
      'Resolve audion externalProjectId from sync/dashboard',
      'PATCH audion project knowledge/description',
      'POST personas + target groups (+ optional journeys)',
    ],
  }

  writeFileSync(join(outDir, 'plan.json'), JSON.stringify(plan, null, 2))
  writeFileSync(join(outDir, 'v2-project.json'), JSON.stringify(v2Project, null, 2))
  console.log(`Plan written → ${join(outDir, 'plan.json')}`)
  console.log(
    `Counts: personas=${plan.counts.personas} tgs=${plan.counts.targetGroups} journeys=${plan.counts.journeys}`,
  )

  if (dryRun) {
    console.log('DRY_RUN=1 — no writes. Set DRY_RUN=0 for Plexon-first write.')
    return
  }

  const collection = await ensureCollection({
    name: collectionName,
    domain: collectionDomain,
  })
  const v3ProjectId = collection.mirrors.audion
  console.log(`Audion mirror: ${v3ProjectId}`)
  console.log(
    `Other mirrors: checkion=${collection.mirrors.checkion || '—'} brandion=${collection.mirrors.brandion || '—'} creation=${collection.mirrors.creation || '—'} spirion=${collection.mirrors.spirion || '—'}`,
  )

  const patched = await v3(
    'PATCH',
    `/api/projects/${encodeURIComponent(v3ProjectId)}`,
    audionPatch,
  )
  console.log(`Patched audion project ${patched.id || v3ProjectId}`)

  const idMap = {
    collection: {
      platformProjectId: collection.platformProjectId,
      companyId: platformCompanyId || str(collection.dashboard?.platformProject?.companyId),
      created: collection.created,
      mirrors: collection.mirrors,
    },
    project: { [sourceProjectId]: v3ProjectId },
    personas: {},
    targetGroups: {},
    journeys: {},
  }

  for (const { v2Id, detail } of personaDetails) {
    const payload = mapPersona(detail, v3ProjectId)
    if (!payload) {
      console.warn(`Skip persona ${v2Id} (no name)`)
      continue
    }
    const created = await v3('POST', '/api/personas', payload)
    idMap.personas[v2Id] = created.id
    console.log(`  persona ${v2Id} → ${created.id} (${payload.name})`)
  }

  for (const { v2Id, detail, linkedV2PersonaIds } of tgDetails) {
    const linkedPersonaIds = linkedV2PersonaIds
      .map((pid) => idMap.personas[pid])
      .filter(Boolean)
    const payload = mapTargetGroup(detail, v3ProjectId, linkedPersonaIds)
    if (!payload) {
      console.warn(`Skip TG ${v2Id} (no name)`)
      continue
    }
    const created = await v3('POST', '/api/target-groups', payload)
    idMap.targetGroups[v2Id] = created.id
    console.log(`  tg ${v2Id} → ${created.id} (${payload.name})`)
  }

  if (includeJourneys) {
    for (const { v2Id, detail } of journeyDetails) {
      const tgV2 =
        str(detail.target_group_id) ||
        str(detail.targetGroupId) ||
        str(detail.target_group?.id)
      const payload = mapJourney(
        detail,
        v3ProjectId,
        (tgV2 && idMap.targetGroups[tgV2]) || null,
      )
      if (!payload) continue
      try {
        const created = await v3('POST', '/api/journeys', payload)
        idMap.journeys[v2Id] = created.id
        console.log(`  journey ${v2Id} → ${created.id}`)
      } catch (e) {
        console.warn(`Journey ${v2Id} failed:`, e.status, e.body)
      }
    }
  }

  writeFileSync(
    join(outDir, 'id-map.json'),
    JSON.stringify({ idMap, syncResults: collection.syncResults }, null, 2),
  )
  console.log(`\nDone. id-map → ${join(outDir, 'id-map.json')}`)
  console.log(`Collection: ${plexonBase}/projects/${collection.platformProjectId}`)
  console.log(`Audion: ${v3Base}/projects/${v3ProjectId}`)
}

main().catch((err) => {
  console.error(err.message)
  if (err.body) console.error(JSON.stringify(err.body, null, 2))
  process.exit(1)
})
