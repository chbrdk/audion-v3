#!/usr/bin/env node
/**
 * Seed Bosch eBike project + target group + Alex/Sam personas via AUDION v3 BFF API.
 *
 * Env (never commit secrets):
 *   AUDION_API_TOKEN   — Bearer token (`audion_…`)
 *   AUDION_V3_BASE_URL — default http://127.0.0.1:3006 (local) or staging origin
 *
 * Usage:
 *   AUDION_API_TOKEN=… node scripts/seed-bosch-ebike-via-api.mjs
 *   AUDION_V3_BASE_URL=https://audion-v3.projects-a.plygrnd.tech AUDION_API_TOKEN=… node scripts/seed-bosch-ebike-via-api.mjs
 */

const DEFAULT_BASE = 'http://127.0.0.1:3006'
const STAGING_ORIGIN = 'https://audion-v3.projects-a.plygrnd.tech'

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

const projectPayload = {
  name: 'Bosch eBike',
  nameDe: 'Bosch eBike Systems',
  description:
    'AUDION workspace for Bosch eBike Systems — Produktkombinationen, Smart System compatibility, and UX studies for owners and purchase-intent riders.',
  status: 'published',
  companyContext:
    'Bosch eBike Systems provides modular drive systems (drive unit, battery, display, app) for OEMs and riders. Key service surface: Produktkombinationen compatibility finder for the smart system. Audiences: eBike owners exploring upgrades (display/battery/controls) and purchase-intent riders checking which components fit before buying.',
  knowledgeChapters: [
    {
      id: 'ch-brand',
      title: 'Brand & product',
      body: 'Bosch eBike Systems — modular smart system (motor, battery, display, Flow app). Service: Produktkombinationen at bosch-ebike.com for compatible combinations.',
    },
    {
      id: 'ch-ux-focus',
      title: 'UX study focus',
      body: 'Primary target URL: Produktkombinationen configurator. Validate filter clarity, next steps after results, jargon load, and purchase vs upgrade paths (Alex Nachrüster / Sam Kaufinteressent).',
    },
  ],
}

const targetGroupPayload = (projectId) => ({
  name: 'eBike Nachrüster & Kaufinteressenten',
  segment: 'DE · Smart System',
  description:
    'Deutsche eBike-Besitzer mit Nachrüst-Interesse sowie Kaufinteressenten, die vor dem Kauf Systemkompatibilität (Motor/Akku/Display) prüfen.',
  status: 'active',
  projectId,
})

const personaAlex = (projectId) => ({
  name: 'Alex Nachrüster',
  role: 'eBike-Besitzer · Nachrüst-Interesse',
  status: 'ready',
  archetype: 'Owner upgrade',
  age: '35–44',
  location: 'Deutschland',
  bio: 'Fährt regelmäßig eBike im Alltag und auf Touren. Hat sich schon kurz über Nachrüstungen (Display/Akku/Bedieneinheit) informiert. Technik-Kenntnisse auf Basic-Niveau — will kompatible Displays zum eigenen Motor finden ohne Fachjargon.',
  attentionSpan: 'Kurz; bricht bei unklaren Filtern ab',
  mediaAffinity: 0.45,
  confidence: 0.55,
  techLiteracy: 0.42,
  emotionalBaseline: 'cautious',
  stressTriggers: [
    'Unklare Filterlogik in Konfiguratoren',
    'Fachjargon ohne Erklärung',
    'Fehlender nächster Schritt nach der Antwort',
  ],
  motivations: [
    { label: 'Kompatible Displays zum eigenen Motor finden', type: 'intrinsic' },
    { label: 'Sichere Kaufentscheidung ohne Fachjargon', type: 'extrinsic' },
  ],
  traits: { Pragmatic: 0.78, Cautious: 0.72, Analytical: 0.48, Patient: 0.35 },
  interests: ['eBike Touren', 'Nachrüstung', 'Alltagsmobilität'],
  values: ['Klarheit', 'Vertrauen', 'Kein Overengineering'],
  socialMediaUsage: ['YouTube', 'Foren'],
  communicationStyle: {
    vocabulary: ['Nachrüstung', 'kompatibel', 'Display', 'Akku', 'was passt dazu'],
    sentenceStructure: 'Kurze Fragen; denkt laut; meldet Verwirrung ehrlich.',
    skepticismLevel: 0.7,
  },
  goals: [
    { label: 'Kompatible Displays zum eigenen Motor finden', priority: 0 },
    { label: 'Sichere Kaufentscheidung ohne Fachjargon', priority: 1 },
  ],
  frustrations: [
    { label: 'Unklare Filterlogik', evidenceCount: 0 },
    { label: 'Unsicherheit was als Nächstes zu tun ist', evidenceCount: 0 },
  ],
  channels: ['Service-Seiten', 'YouTube'],
  headlineDe: 'Besitzt ein eBike und prüft Upgrades für Display/Akku/Bedieneinheit',
  journeyBehavior: {
    dimensionOverrides: {
      detailOrientation: 0.45,
      trustSkepticism: 0.7,
      exploration: 0.4,
      riskAversion: 0.65,
      timePressure: 0.55,
    },
    dos: ['Laut denken auf Deutsch', 'Filteränderungen erklären', 'Unklare Ausblendungen benennen'],
    donts: ['Fachjargon voraussetzen', 'Bei 403 so tun als wäre die Seite ok'],
  },
  projectId,
})

const personaSam = (projectId) => ({
  name: 'Sam Kaufinteressent',
  role: 'eBike Kaufinteressent',
  status: 'ready',
  archetype: 'Purchase intent',
  age: '28–38',
  location: 'Deutschland',
  bio: 'Interessiert sich für eBikes, besitzt noch keines. Plant einen Kauf in den nächsten 6 Monaten und will verstehen, welche Komponenten zusammenpassen, bevor er/sie kauft.',
  attentionSpan: 'Mittel; überfordert von dichten Matrizen',
  mediaAffinity: 0.58,
  confidence: 0.4,
  techLiteracy: 0.28,
  emotionalBaseline: 'curious-overwhelmed',
  stressTriggers: [
    'Überforderung durch Matrix-UI',
    'Fehlender klarer Next Step Richtung Kauf',
    'Komponenten ohne Erklärkontext',
  ],
  motivations: [
    { label: 'Verstehen welche Kombinationen möglich sind', type: 'intrinsic' },
    { label: 'Nächsten Schritt Richtung Kauf finden', type: 'extrinsic' },
  ],
  traits: { Curious: 0.8, Cautious: 0.75, Analytical: 0.4, Decisive: 0.35 },
  interests: ['eBike-Kauf', 'Cargo', 'Kompatibilität'],
  values: ['Orientierung', 'Vertrauen', 'Einfacher Einstieg'],
  socialMediaUsage: ['Instagram', 'YouTube'],
  communicationStyle: {
    vocabulary: ['passt das zusammen', 'nächster Schritt', 'kaufen', 'Cargo'],
    sentenceStructure: 'Fragt nach Orientierung; braucht Bestätigung.',
    skepticismLevel: 0.65,
  },
  goals: [
    { label: 'Verstehen welche Kombinationen möglich sind', priority: 0 },
    { label: 'Nächsten Schritt Richtung Kauf finden', priority: 1 },
  ],
  frustrations: [
    { label: 'Überforderung durch Matrix', evidenceCount: 0 },
    { label: 'Fehlender klarer Next Step', evidenceCount: 0 },
  ],
  channels: ['Produktseiten', 'YouTube'],
  headlineDe: 'Plant eBike-Kauf in den nächsten 6 Monaten und prüft Systemkompatibilität',
  journeyBehavior: {
    dimensionOverrides: {
      detailOrientation: 0.35,
      trustSkepticism: 0.65,
      exploration: 0.55,
      riskAversion: 0.7,
      timePressure: 0.5,
    },
    dos: [
      'Laut denken auf Deutsch',
      'Nutzen vs. Reibung für Kaufinteressenten bewerten',
      'Next-Step Richtung Kauf einfordern',
    ],
    donts: [
      'Als Experte auftreten',
      'Bei fehlender Erklärung weitermachen als wäre alles klar',
    ],
  },
  projectId,
})

async function main() {
  console.log(`Base: ${baseUrl}${baseUrl === STAGING_ORIGIN ? ' (staging)' : ''}`)

  const verify = await api('POST', '/api/settings/tokens/verify')
  console.log('Token OK:', verify.ownerId, verify.tokenId)

  const project = await api('POST', '/api/projects', projectPayload)
  console.log('Project:', project.id, project.name)

  const alex = await api('POST', '/api/personas', personaAlex(project.id))
  console.log('Persona:', alex.id, alex.name)

  const sam = await api('POST', '/api/personas', personaSam(project.id))
  console.log('Persona:', sam.id, sam.name)

  const tg = await api('POST', '/api/target-groups', {
    ...targetGroupPayload(project.id),
    linkedPersonaIds: [alex.id, sam.id],
  })
  console.log('Target group:', tg.id, tg.name)

  const summary = {
    baseUrl,
    createdAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      href: `${baseUrl}/projects/${project.id}`,
    },
    targetGroup: {
      id: tg.id,
      name: tg.name,
      href: `${baseUrl}/target-groups/${tg.id}`,
    },
    personas: [
      { id: alex.id, name: alex.name, href: `${baseUrl}/personas/${alex.id}` },
      { id: sam.id, name: sam.name, href: `${baseUrl}/personas/${sam.id}` },
    ],
  }

  console.log('\n=== Created ===')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err.message)
  if (err.body) console.error(JSON.stringify(err.body, null, 2))
  process.exit(1)
})
