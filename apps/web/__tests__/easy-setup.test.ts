import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  hostBlockedForSsrf,
  normalizePublicHttpUrl,
} from '../lib/easy-setup-url'
import { runEasySetup } from '../lib/easy-setup'
import { resetPersonaStore, storePersonaDetail } from '../lib/fixtures/persona-store'
import { resetProjectStore, storeProjectDetail } from '../lib/fixtures/project-store'
import {
  resetTargetGroupStore,
  storeTargetGroupDetail,
} from '../lib/fixtures/target-group-store'

vi.mock('../lib/ai/assist', () => ({
  runAssist: vi.fn(async () => ({
    ok: true as const,
    text: '',
    json: {
      items: [
        {
          title: 'AI Urban Commuters',
          subtitle: 'City riders',
          description: 'Commuters who value reliability',
        },
      ],
    },
    suggestions: [
      {
        id: 'tg-1',
        title: 'AI Urban Commuters',
        subtitle: 'City riders',
        description: 'Commuters who value reliability',
      },
    ],
  })),
  runAssistJson: vi.fn(async () => ({
    ok: true as const,
    text: '',
    data: {
      personas: [
        {
          name: 'Alex Rider',
          role: 'Daily commuter',
          archetype: 'City riders',
          bio: 'Takes the bike to work every day.',
          interests: ['ebikes'],
        },
      ],
    },
  })),
}))

vi.mock('../lib/plexon-project-origin', () => ({
  registerAudionProjectOnPlexon: vi.fn(async () => null),
}))

describe('easy-setup-url SSRF guard', () => {
  it('blocks localhost and private IPs', async () => {
    expect(hostBlockedForSsrf('localhost')).toBe(true)
    expect(hostBlockedForSsrf('127.0.0.1')).toBe(true)
    expect(hostBlockedForSsrf('10.0.0.1')).toBe(true)
    expect(hostBlockedForSsrf('192.168.1.1')).toBe(true)
    expect(hostBlockedForSsrf('169.254.169.254')).toBe(true)
    expect(hostBlockedForSsrf('example.com')).toBe(false)
  })

  it('rejects non-http schemes and credentialed URLs', async () => {
    expect(normalizePublicHttpUrl('ftp://example.com')).toEqual({
      error: 'Only http and https URLs are allowed.',
    })
    expect(normalizePublicHttpUrl('http://user:pass@example.com/')).toEqual({
      error: 'URLs with credentials are not allowed.',
    })
    expect(normalizePublicHttpUrl('https://example.com/about')).toEqual({
      url: 'https://example.com/about',
    })
  })
})

describe('runEasySetup', () => {
  afterEach(() => {
    resetProjectStore()
    resetTargetGroupStore()
    resetPersonaStore()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates project, TG, and persona in stub mode without OpenAI key', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    vi.stubEnv('OPENAI_API_KEY', '')

    const result = await runEasySetup({
      customer_name: 'Acme Bikes',
      about: 'We sell premium city e-bikes to urban professionals.',
      project_name: 'Acme Research 2026',
    })

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.stubbed).toBe(true)
    expect(result.websiteExcerptIncluded).toBe(false)
    expect(result.project.name).toBe('Acme Research 2026')
    expect(result.project.description).toContain('Acme Bikes')
    expect(result.project.companyContext).toContain('urban professionals')
    expect(result.targetGroup.projectId).toBe(result.project.id)
    expect(result.persona.projectId).toBe(result.project.id)
    expect(result.targetGroup.linkedPersonas.some((p) => p.id === result.persona.id)).toBe(
      true,
    )

    const project = await storeProjectDetail(result.project.id)
    expect(project?.personaCount).toBe(1)
    expect(project?.targetGroupCount).toBe(1)
    expect((await storeTargetGroupDetail(result.targetGroup.id))?.personaCount).toBe(1)
    expect((await storePersonaDetail(result.persona.id))?.name).toContain('Acme Bikes')
  })

  it('uses native assist when AI runtime prefers native', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'native')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    const result = await runEasySetup({
      customer_name: 'Acme Bikes',
      about: 'Urban e-bike brand.',
    })

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.stubbed).toBe(false)
    expect(result.project.name).toBe('Acme Bikes')
    expect(result.targetGroup.name).toBe('AI Urban Commuters')
    expect(result.persona.name).toBe('Alex Rider')
  })

  it('merges website excerpt when fetch succeeds', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    vi.stubEnv('OPENAI_API_KEY', '')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('<html><body><p>Welcome to Acme public site</p></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    const result = await runEasySetup({
      customer_name: 'Acme',
      about: 'Bike brand',
      website_url: 'https://example.com',
    })

    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.websiteExcerptIncluded).toBe(true)
    expect(result.project.companyContext).toContain('Welcome to Acme public site')
  })

  it('rejects private website hosts', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    const result = await runEasySetup({
      customer_name: 'Acme',
      about: 'Bike brand',
      website_url: 'http://127.0.0.1/secret',
    })
    expect(result).toEqual({ error: 'URL host is not allowed.', status: 400 })
  })

  it('requires customer_name and about', async () => {
    expect(await runEasySetup({ customer_name: '', about: 'x' })).toEqual({
      error: 'customer_name is required',
      status: 400,
    })
    expect(await runEasySetup({ customer_name: 'Acme', about: '  ' })).toEqual({
      error: 'about is required',
      status: 400,
    })
  })
})
