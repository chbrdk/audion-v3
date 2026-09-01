#!/usr/bin/env npx tsx
/**
 * Seed Vaillant **Group** UC1 personas on AUDION v3 staging.
 *
 *   AUDION_API_TOKEN=audion_… npx tsx scripts/seed-vaillant-group-mafo.ts
 */

import {
  VAILLANT_GROUP_AUDION_PROJECT_ID,
  VAILLANT_GROUP_UC1_PERSONAS,
} from '../apps/web/lib/fixtures/vaillant-group-mafo-seed.ts'

const DEFAULT_BASE = 'https://audion-v3.projects-a.plygrnd.tech'
const baseUrl = (process.env.AUDION_V3_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
const token = process.env.AUDION_API_TOKEN?.trim()

if (!token) {
  console.error('Missing AUDION_API_TOKEN')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`) as Error & {
      status: number
      body: unknown
    }
    err.status = res.status
    err.body = json
    throw err
  }
  return json as Record<string, unknown>
}

async function main() {
  console.log(`Base: ${baseUrl}`)
  console.log(`Project: ${VAILLANT_GROUP_AUDION_PROJECT_ID} (Vaillant Group only)`)

  const existing = (await api(
    'GET',
    `/api/personas?projectId=${encodeURIComponent(VAILLANT_GROUP_AUDION_PROJECT_ID)}&pageSize=100`,
  )) as { items?: Array<{ id: string; name: string }> }

  const byId = new Set((existing.items ?? []).map((p) => p.id))

  for (const seed of VAILLANT_GROUP_UC1_PERSONAS) {
    if (byId.has(seed.id)) {
      console.log(`skip (exists): ${seed.id} — ${seed.name}`)
      continue
    }
    const payload = {
      name: seed.name,
      role: seed.role,
      status: seed.status,
      archetype: seed.archetype,
      age: seed.age,
      location: seed.location,
      bio: seed.bio,
      stressTriggers: seed.stressTriggers,
      motivations: seed.motivations,
      traits: seed.traits,
      goals: seed.goals,
      frustrations: seed.frustrations,
      journeyDimensions: seed.journeyDimensions,
      projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
    }
    const created = (await api('POST', '/api/personas', payload)) as { id: string; name: string }
    console.log(`created: ${created.id} — ${created.name}`)
  }

  console.log('Done.')
}

main().catch((e: Error & { body?: unknown }) => {
  console.error(e.message, e.body ?? '')
  process.exit(1)
})
