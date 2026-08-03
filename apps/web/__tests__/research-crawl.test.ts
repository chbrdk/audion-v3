import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  crawlResearchSeed,
  isResearchCrawlBlocked,
  researchFallbackUrls,
} from '../lib/ai/research-crawl'
import { setCheckionFetchPageForTests } from '../lib/checkion-fetch-page'
import { paths } from '../lib/paths'

describe('research crawl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setCheckionFetchPageForTests(null)
  })

  it('detects CloudFront 403 / request blocked bodies', () => {
    expect(isResearchCrawlBlocked(403, 'Request blocked')).toBe(true)
    expect(isResearchCrawlBlocked(200, 'TYPO3 eBike Systems Hub Line')).toBe(false)
    expect(isResearchCrawlBlocked(200, '403 Request blocked by CloudFront')).toBe(true)
  })

  it('returns Bosch press + service fallbacks from paths', () => {
    const urls = researchFallbackUrls(paths.boschEbikeHomeUrl)
    expect(urls).toContain(paths.boschEbikeProduktkombinationenUrl)
    expect(urls).toContain(paths.boschEbikePressHubMotorUrl)
    expect(urls).not.toContain(paths.boschEbikeHomeUrl)
  })

  it('falls back when seed is blocked and recovers from press URL', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('bosch-ebike.com')) {
        return new Response('Request blocked', { status: 403 })
      }
      if (url.includes('bosch-presse.de')) {
        return new Response(
          '<html><body><h1>Bosch eBike Systems Hub Line</h1><p>Urban portfolio with PowerTube 360.</p></body></html>',
          { status: 200 },
        )
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await crawlResearchSeed('https://www.bosch-ebike.com/')
    expect(result.blockedCount).toBeGreaterThanOrEqual(1)
    expect(result.fetchedOk).toBeGreaterThanOrEqual(1)
    expect(result.combinedText).toMatch(/Hub Line/)
    expect(result.pages.some((p) => p.url === paths.boschEbikePressHubMotorUrl && p.ok)).toBe(
      true,
    )
  })

  it('recovers blocked seed via CHECKION fetch-page before URL fallbacks', async () => {
    const fetchMock = vi.fn(async () => new Response('Request blocked', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    setCheckionFetchPageForTests(async (url) => ({
      url,
      finalUrl: url,
      title: 'Bosch',
      bodyTextExcerpt: 'CHECKION Chromium recovered Hub Line and PowerTube content for research.',
      httpStatus: 200,
      stubbed: false,
    }))

    const result = await crawlResearchSeed('https://www.bosch-ebike.com/de/')
    expect(result.pages.some((p) => p.source === 'checkion_fetch_page' && p.ok)).toBe(true)
    expect(result.combinedText).toMatch(/CHECKION Chromium recovered/)
  })

  it('sends browser-like User-Agent on crawl fetch', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        '<html><body>' + 'Bosch eBike content '.repeat(20) + '</body></html>',
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    await crawlResearchSeed('https://example.com/')
    expect(fetchMock).toHaveBeenCalled()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['User-Agent']).toBe(paths.researchCrawlUserAgent)
  })
})
