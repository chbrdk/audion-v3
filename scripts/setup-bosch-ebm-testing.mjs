#!/usr/bin/env node
/**
 * Bosch eBike EBM testing setup on AUDION v3 staging.
 *
 * Ensures study+wave from ScenarioPack, remaps personas, optionally syncs Plexon.
 *
 * Env:
 *   AUDION_API_TOKEN (required)
 *   AUDION_V3_BASE_URL (default staging)
 *   BOSCH_PROJECT_ID (default from knowledge seed)
 *   PLEXON_OWNER_USER_ID / PLEXON_COMPANY_ID (optional sync body)
 */

const DEFAULT_BASE = 'https://audion-v3.projects-a.plygrnd.tech'
const DEFAULT_PROJECT = 'proj-bosch-ebike-msd3hwtv'
const DEFAULT_ALEX = 'persona-alex-nachr-ster-msd3hwvw'
const DEFAULT_SAM = 'persona-sam-kaufinteressent-msd3hwx2'
const PACK_ID = 'pack-ebm-produktkombinationen'

const baseUrl = (process.env.AUDION_V3_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
const token = process.env.AUDION_API_TOKEN?.trim()
const projectId = process.env.BOSCH_PROJECT_ID?.trim() || DEFAULT_PROJECT
const alexId = process.env.BOSCH_ALEX_PERSONA_ID?.trim() || DEFAULT_ALEX
const samId = process.env.BOSCH_SAM_PERSONA_ID?.trim() || DEFAULT_SAM

if (!token) {
  console.error('Missing AUDION_API_TOKEN')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`)
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

async function main() {
  console.log(`Base: ${baseUrl}`)
  console.log(`Project: ${projectId}`)

  const studyPayload = {
    packId: PACK_ID,
    projectId,
    name: 'EBM Produktkombinationen — Bosch eBike',
    waveKey: `wave-bosch-${new Date().toISOString().slice(0, 10)}`,
  }

  let study
  let wave
  try {
    const created = await api('POST', '/api/studies/from-pack', studyPayload)
    study = created.study
    wave = created.wave
    console.log('Study created:', study.id)
  } catch (e) {
    console.warn('from-pack failed (may already exist):', e.message, e.body)
    const list = await api('GET', '/api/studies')
    study = (list.items || []).find((s) => s.projectId === projectId) || null
    if (!study) throw e
    console.log('Using existing study:', study.id)
    const waves = await api('GET', `/api/studies/${study.id}/waves`)
    wave = (waves.items || waves.waves || [])[0] || null
  }

  if (wave?.id) {
    const detail = await api('GET', `/api/studies/${study.id}/waves/${wave.id}`)
    const map = {
      'persona-alex-nachruester': alexId,
      'persona-sam-kaufinteressent': samId,
    }
    const runs = (detail.runs || []).map((r) => ({
      ...r,
      personaId: map[r.personaId] || r.personaId,
    }))
    wave = await api('PATCH', `/api/studies/${study.id}/waves/${wave.id}`, { runs })
    console.log(
      'Wave personas:',
      wave.runs.map((r) => `${r.runKey}=${r.personaId}`).join(', '),
    )
  }

  let plexon = null
  try {
    const body = {}
    if (process.env.PLEXON_OWNER_USER_ID) body.ownerPlexonUserId = process.env.PLEXON_OWNER_USER_ID
    if (process.env.PLEXON_COMPANY_ID) body.platformCompanyId = process.env.PLEXON_COMPANY_ID
    body.domain = 'bosch-ebike.com'
    plexon = await api('POST', `/api/projects/${projectId}/sync-plexon`, body)
    console.log('Plexon sync:', plexon)
  } catch (e) {
    console.warn('Plexon sync skipped/failed:', e.message)
    if (e.body) console.warn(JSON.stringify(e.body, null, 2))
  }

  const summary = {
    baseUrl,
    projectId,
    studyId: study?.id,
    studyHref: study ? `${baseUrl}/studies/${study.id}` : null,
    waveId: wave?.id,
    waveHref:
      study && wave ? `${baseUrl}/studies/${study.id}/waves/${wave.id}` : null,
    plexon,
  }
  console.log('\n=== Setup ===')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err.message)
  if (err.body) console.error(JSON.stringify(err.body, null, 2))
  process.exit(1)
})
