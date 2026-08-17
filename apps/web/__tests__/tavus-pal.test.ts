import { afterEach, describe, expect, it, vi } from 'vitest'
import { PATCH as patchPersona } from '../app/api/personas/[personaId]/route'
import {
  resetPersonaStore,
  storeCreatePersona,
  storePersonaDetail,
} from '../lib/fixtures/persona-store'
import { paths } from '../lib/paths'
import {
  buildTavusPalPatchOps,
  buildTavusPalUpsertPayload,
  tavusPalLivePatchUrl,
  tavusPalsUrl,
  upsertTavusPal,
} from '../lib/tavus/pals'
import { buildTavusPalSystemPrompt, tavusPalName } from '../lib/tavus/prompt'

afterEach(() => {
  resetPersonaStore()
  vi.unstubAllGlobals()
  delete process.env[paths.envTavusApiKey]
  delete process.env[paths.envTavusApiBase]
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('tavus PAL prompt', () => {
  it('builds a spoken identity prompt from magazine fields, not a JSON dump', () => {
    const prompt = buildTavusPalSystemPrompt({
      name: 'Sabine Koller',
      role: 'Einkäuferin',
      bio: 'Kauft Geräte für den Haushalt in München.',
      location: 'München, Deutschland',
      goals: [{ label: 'Schnell eine klare Empfehlung' }],
      frustrations: [{ label: 'Zu viele Filter' }],
      communicationStyle: {
        vocabulary: ['klar', 'bitte'],
        sentenceStructure: 'Kurz und direkt',
        skepticismLevel: 0.4,
      },
      journeyBehavior: { dos: ['Nach dem Preis fragen'], donts: ['Nicht um den heißen Brei'] },
    })
    expect(prompt).toContain('You are Sabine Koller, Einkäuferin')
    expect(prompt).toContain('Schnell eine klare Empfehlung')
    expect(prompt).toContain('Zu viele Filter')
    expect(prompt).toContain('Default to German')
    expect(prompt).not.toContain('traits')
    expect(prompt.length).toBeLessThanOrEqual(paths.tavusPalSystemPromptMaxChars)
  })

  it('does not dump knowledge or tiles', () => {
    const prompt = buildTavusPalSystemPrompt({
      name: 'Alex',
      role: 'Lead',
      bio: 'Ships briefs.',
    })
    expect(prompt).toContain('Alex')
    expect(prompt).not.toMatch(/knowledgeEntries|visuals|moodboard/i)
  })
})

describe('tavus PAL upsert', () => {
  it('builds create payload with face + spoken prompt', () => {
    const payload = buildTavusPalUpsertPayload({
      name: 'Alex',
      role: 'Lead',
      tavusReplicaId: 'r5e781e37a8d',
    })
    expect(payload).toMatchObject({
      pal_name: tavusPalName('Alex'),
      pipeline_mode: paths.tavusPalPipelineMode,
      default_face_id: 'r5e781e37a8d',
    })
    expect(payload?.system_prompt).toContain('Alex')
    expect(buildTavusPalPatchOps(payload!)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'replace', path: '/system_prompt' }),
        expect.objectContaining({ op: 'replace', path: '/default_face_id', value: 'r5e781e37a8d' }),
      ]),
    )
  })

  it('creates a PAL when none is stored', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(tavusPalsUrl(paths.tavusApiDefaultBase))
      expect(init?.method).toBe('POST')
      return jsonResponse({ pal_id: 'p-new' })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      upsertTavusPal({ name: 'Alex', role: 'Lead', tavusReplicaId: 'r5e781e37a8d' }),
    ).resolves.toEqual({ palId: 'p-new', created: true })
  })

  it('patches an existing PAL with target=live', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(tavusPalLivePatchUrl('pdad1aea8aab', paths.tavusApiDefaultBase))
      expect(init?.method).toBe('PATCH')
      const ops = JSON.parse(String(init?.body)) as Array<{ path: string }>
      expect(ops.some((op) => op.path === '/system_prompt')).toBe(true)
      return jsonResponse({ pal_id: 'pdad1aea8aab' })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      upsertTavusPal({
        name: 'Sabine',
        role: 'Lead',
        tavusReplicaId: 'r0a8102ab353',
        tavusPersonaId: 'pdad1aea8aab',
      }),
    ).resolves.toEqual({ palId: 'pdad1aea8aab', created: false })
  })

  it('creates after a 404 patch', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('missing')) {
        return jsonResponse({ error: 'not found' }, 404)
      }
      return jsonResponse({ pal_id: 'p-recreated' })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      upsertTavusPal({
        name: 'Alex',
        tavusReplicaId: 'r5e781e37a8d',
        tavusPersonaId: 'missing',
      }),
    ).resolves.toEqual({ palId: 'p-recreated', created: true })
  })
})

describe('PATCH /api/personas PAL sync', () => {
  it('writes pal_id back when a replica is saved', async () => {
    process.env[paths.envTavusApiKey] = 'test-tavus-key'
    const created = await storeCreatePersona({ name: 'Video Face', role: 'Replica' })
    const fetchMock = vi.fn(async () => jsonResponse({ pal_id: 'p-from-save' }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await patchPersona(
      new Request(`http://localhost${paths.routes.apiPersonaDetail(created.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tavusReplicaId: 'r5e781e37a8d' }),
      }),
      { params: Promise.resolve({ personaId: created.id }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { tavusPersonaId: string | null }
    expect(body.tavusPersonaId).toBe('p-from-save')
    expect((await storePersonaDetail(created.id))?.tavusPersonaId).toBe('p-from-save')
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(tavusPalsUrl(paths.tavusApiDefaultBase))
  })

  it('still saves the replica when Tavus is not configured', async () => {
    const created = await storeCreatePersona({ name: 'Offline', role: 'Replica' })
    const res = await patchPersona(
      new Request(`http://localhost${paths.routes.apiPersonaDetail(created.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tavusReplicaId: 'r5e781e37a8d' }),
      }),
      { params: Promise.resolve({ personaId: created.id }) },
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      tavusReplicaId: 'r5e781e37a8d',
      tavusPersonaId: null,
    })
  })
})
