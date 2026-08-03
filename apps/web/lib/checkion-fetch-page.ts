/**
 * AUDION → CHECKION thin page-text client (research crawl fallback).
 * Spec: specs/domain/checkion-fetch-page-research.md
 */

import { paths } from './paths'
import { getCheckionBaseUrl } from './runtime-config'

export type CheckionFetchPageResult = {
  url: string
  finalUrl: string
  title: string | null
  bodyTextExcerpt: string
  httpStatus: number | null
  stubbed: boolean
}

export function getCheckionApiToken(): string {
  return process.env[paths.envCheckionApiToken]?.trim() || ''
}

export function isCheckionFetchPageConfigured(): boolean {
  return Boolean(getCheckionBaseUrl() && getCheckionApiToken())
}

type FetchPageFn = (url: string) => Promise<CheckionFetchPageResult | null>

let fetchPageForTests: FetchPageFn | null = null

/** Test hook — stub CHECKION HTTP. */
export function setCheckionFetchPageForTests(fn: FetchPageFn | null): void {
  fetchPageForTests = fn
}

export async function fetchPageViaCheckion(
  url: string,
): Promise<CheckionFetchPageResult | null> {
  if (fetchPageForTests) return fetchPageForTests(url)
  if (!isCheckionFetchPageConfigured()) return null

  const base = getCheckionBaseUrl().replace(/\/$/, '')
  const token = getCheckionApiToken()
  try {
    const res = await fetch(`${base}${paths.checkionApiFetchPage}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url }),
      cache: 'no-store',
      signal: AbortSignal.timeout(paths.checkionFetchPageTimeoutMs),
    })
    if (!res.ok) return null
    const data = (await res.json()) as CheckionFetchPageResult
    if (!data?.bodyTextExcerpt?.trim()) return null
    return data
  } catch {
    return null
  }
}
