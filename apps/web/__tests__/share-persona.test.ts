import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storeSharePersona } from '../lib/fixtures/chat-share'

vi.mock('../lib/fixtures/persona-store', () => ({
  storePersonaDetail: vi.fn(),
}))

vi.mock('../lib/persona-api-proxy', () => ({
  fetchPersonaApi: vi.fn(),
}))

import { storePersonaDetail } from '../lib/fixtures/persona-store'
import { fetchPersonaApi } from '../lib/persona-api-proxy'
import { fetchSharePersona } from '../lib/chat/share-persona'

describe('fetchSharePersona', () => {
  const env = process.env

  beforeEach(() => {
    vi.mocked(storePersonaDetail).mockReset()
    vi.mocked(fetchPersonaApi).mockReset()
    process.env = { ...env, NEXT_PERSONA_DATA_SOURCE: 'api' }
  })

  afterEach(() => {
    process.env = env
  })

  it('prefers Audion v3 local store (EQC native personas)', async () => {
    vi.mocked(storePersonaDetail).mockResolvedValue({
      id: 'persona-elena-m4abc',
      name: 'Elena',
      role: 'Buyer',
      projectId: 'proj-eqc-1',
      status: 'ready',
      archetype: null,
      updatedAt: null,
      avatarUrl: null,
      bio: 'Bio',
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
    } as never)

    const result = await fetchSharePersona('persona-elena-m4abc', 'proj-eqc-1')
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.name).toBe('Elena')
    expect(fetchPersonaApi).not.toHaveBeenCalled()
  })

  it('falls back to legacy FastAPI public for UUID personas', async () => {
    vi.mocked(storePersonaDetail).mockResolvedValue(null)
    vi.mocked(fetchPersonaApi).mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Legacy',
        role: 'Role',
        project_id: '22222222-2222-4222-8222-222222222222',
      },
    })

    const result = await fetchSharePersona(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    )
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.name).toBe('Legacy')
  })

  it('uses demo fixtures when data source is fixtures and persona is not in store', async () => {
    process.env.NEXT_PERSONA_DATA_SOURCE = 'fixtures'
    vi.mocked(storePersonaDetail).mockResolvedValue(null)
    const result = await fetchSharePersona('persona-alex-morgan', 'proj-audion-core')
    expect(result).toEqual(storeSharePersona('persona-alex-morgan', 'proj-audion-core'))
  })

  it('still reads Postgres store when NEXT_PERSONA_DATA_SOURCE=fixtures', async () => {
    process.env.NEXT_PERSONA_DATA_SOURCE = 'fixtures'
    vi.mocked(storePersonaDetail).mockResolvedValue({
      id: 'persona-katrin-weber-mt0a2mqw',
      name: 'Katrin Weber',
      role: 'Buyer',
      projectId: 'proj-viessmann-mt09sb7u',
      status: 'ready',
      archetype: null,
      updatedAt: null,
      avatarUrl: null,
      bio: 'Bio',
    } as never)

    const result = await fetchSharePersona(
      'persona-katrin-weber-mt0a2mqw',
      'proj-viessmann-mt09sb7u',
    )
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.name).toBe('Katrin Weber')
    expect(fetchPersonaApi).not.toHaveBeenCalled()
  })

  it('rejects mismatched project on local store persona', async () => {
    vi.mocked(storePersonaDetail).mockResolvedValue({
      id: 'persona-elena-m4abc',
      name: 'Elena',
      role: 'Buyer',
      projectId: 'proj-other',
      status: 'ready',
      archetype: null,
      updatedAt: null,
      avatarUrl: null,
      bio: null,
    } as never)

    const result = await fetchSharePersona('persona-elena-m4abc', 'proj-eqc-1')
    expect(result).toMatchObject({ error: 'Share token does not match persona project', status: 403 })
  })
})
