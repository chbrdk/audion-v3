import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storeSharePersona } from '../lib/fixtures/chat-share'

vi.mock('../lib/personas', () => ({
  fetchPersonaDetail: vi.fn(),
}))

vi.mock('../lib/persona-api-proxy', () => ({
  fetchPersonaApi: vi.fn(),
}))

import { fetchPersonaDetail } from '../lib/personas'
import { fetchPersonaApi } from '../lib/persona-api-proxy'
import { fetchSharePersona } from '../lib/chat/share-persona'

describe('fetchSharePersona', () => {
  const env = process.env

  beforeEach(() => {
    vi.mocked(fetchPersonaApi).mockReset()
    vi.mocked(fetchPersonaDetail).mockReset()
    process.env = { ...env, NEXT_PERSONA_DATA_SOURCE: 'api' }
  })

  afterEach(() => {
    process.env = env
  })

  it('uses live public persona endpoint when available', async () => {
    vi.mocked(fetchPersonaApi).mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        id: 'live-persona-1',
        name: 'Elena',
        role: 'Buyer',
        project_id: 'proj-eqc',
        avatar_url: null,
        bio: 'Bio',
      },
    })

    const result = await fetchSharePersona('live-persona-1', 'proj-eqc')
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.name).toBe('Elena')
    expect(result.projectId).toBe('proj-eqc')
    expect(fetchPersonaDetail).not.toHaveBeenCalled()
  })

  it('falls back to persona detail when public endpoint misses', async () => {
    vi.mocked(fetchPersonaApi).mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Upstream 404',
    })
    vi.mocked(fetchPersonaDetail).mockResolvedValue({
      origin: 'api',
      persona: {
        id: 'live-persona-2',
        name: 'Marc',
        role: 'Ops',
        projectId: 'proj-eqc',
        status: 'ready',
        archetype: null,
        updatedAt: null,
        avatarUrl: null,
        bio: 'Ops bio',
        headline: null,
        segment: null,
        confidence: null,
        traits: {},
        goals: [],
        painPoints: [],
        interests: [],
        values: [],
        frustrations: [],
        motivations: [],
        journeyBehavior: null,
        communicationStyle: null,
        visuals: null,
        tavusReplicaId: null,
        notes: [],
        targetGroupIds: [],
      },
    })

    const result = await fetchSharePersona('live-persona-2', 'proj-eqc')
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.name).toBe('Marc')
  })

  it('uses demo fixtures when data source is fixtures', async () => {
    process.env.NEXT_PERSONA_DATA_SOURCE = 'fixtures'
    const result = await fetchSharePersona('persona-alex-morgan', 'proj-audion-core')
    expect(result).toEqual(storeSharePersona('persona-alex-morgan', 'proj-audion-core'))
  })

  it('rejects mismatched project on live payload', async () => {
    vi.mocked(fetchPersonaApi).mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        id: 'live-persona-1',
        name: 'Elena',
        project_id: 'proj-other',
      },
    })

    const result = await fetchSharePersona('live-persona-1', 'proj-eqc')
    expect(result).toMatchObject({ error: 'Share token does not match persona project', status: 403 })
  })
})
