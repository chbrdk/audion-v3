/**
 * Project research crawl helpers — browser-like fetch + blocked-page fallbacks.
 * CloudFront on bosch-ebike.com returns 403 for bare Node / custom bot User-Agents.
 */

import { paths } from '../paths'

export type ResearchCrawlPage = {
  url: string
  status: number
  ok: boolean
  blocked: boolean
  text: string
  error?: string
}

export type ResearchCrawlResult = {
  pages: ResearchCrawlPage[]
  combinedText: string
  fetchedOk: number
  blockedCount: number
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Detect WAF / bot-block responses even when body is returned. */
export function isResearchCrawlBlocked(status: number, text: string): boolean {
  if (status === 401 || status === 403 || status === 429) return true
  const head = text.slice(0, 2_500)
  return /\b403\b|request blocked|access denied|cloudfront|bot.?detect|attention required/i.test(
    head,
  )
}

/**
 * Alternate public sources when the seed host blocks datacenter crawlers.
 * Keep URLs in `paths` — never hardcode product hosts elsewhere.
 */
export function researchFallbackUrls(seedUrl: string): string[] {
  let host = ''
  try {
    host = new URL(seedUrl).hostname.toLowerCase()
  } catch {
    return []
  }

  const candidates: string[] = []
  if (host === 'www.bosch-ebike.com' || host === 'bosch-ebike.com') {
    // Press host first — often reachable when CloudFront blocks bosch-ebike.com bot UAs
    candidates.push(
      paths.boschEbikePressHubMotorUrl,
      paths.boschEbikeProduktkombinationenUrl,
      paths.boschEbikeHomeUrl,
    )
  }

  const seedNorm = seedUrl.replace(/\/$/, '')
  return [...new Set(candidates)].filter((u) => u.replace(/\/$/, '') !== seedNorm)
}

export async function fetchResearchPage(url: string): Promise<ResearchCrawlPage> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': paths.researchCrawlUserAgent,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(paths.researchCrawlTimeoutMs),
    })
    const raw = await res.text()
    const plain = htmlToPlainText(raw).slice(0, paths.researchCrawlMaxTextChars)
    const blocked = isResearchCrawlBlocked(res.status, plain || raw)
    return {
      url,
      status: res.status,
      ok: res.ok && !blocked && plain.length > 40,
      blocked,
      text: plain,
      error: blocked
        ? `Blocked HTTP ${res.status}`
        : !res.ok
          ? `HTTP ${res.status}`
          : plain.length <= 40
            ? 'Empty or thin page text'
            : undefined,
    }
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      blocked: false,
      text: '',
      error: error instanceof Error ? error.message : 'Fetch failed',
    }
  }
}

/**
 * Crawl seed first; on block/failure try host-specific fallbacks (max pages).
 * When seed succeeds, still pull up to one extra fallback for richer context.
 */
export async function crawlResearchSeed(seedUrl: string): Promise<ResearchCrawlResult> {
  const maxPages = paths.researchCrawlMaxPages
  const pages: ResearchCrawlPage[] = []

  const seed = await fetchResearchPage(seedUrl)
  pages.push(seed)

  const fallbacks = researchFallbackUrls(seedUrl)
  // When seed is blocked, keep trying fallbacks until one succeeds (or list ends).
  const attemptBudget = seed.ok ? maxPages : Math.min(maxPages + fallbacks.length, 1 + fallbacks.length)

  for (const url of fallbacks) {
    if (pages.length >= attemptBudget) break
    const okCount = pages.filter((p) => p.ok).length
    if (seed.ok && okCount >= 2) break
    if (!seed.ok && okCount >= 1 && pages.length >= 2) break
    const page = await fetchResearchPage(url)
    pages.push(page)
  }

  const okPages = pages.filter((p) => p.ok)
  const combinedText = okPages
    .map((p) => `### ${p.url}\n${p.text}`)
    .join('\n\n')
    .slice(0, paths.researchCrawlMaxTextChars * 2)

  return {
    pages,
    combinedText:
      combinedText ||
      pages
        .map(
          (p) =>
            `### ${p.url}\nstatus=${p.status} blocked=${p.blocked} error=${p.error || ''}\n${p.text}`,
        )
        .join('\n\n')
        .slice(0, 4_000),
    fetchedOk: okPages.length,
    blockedCount: pages.filter((p) => p.blocked).length,
  }
}
