/**
 * SSRF-safe public URL → plain text for Easy Setup company context.
 * Ported from V2 apps/api/app/services/easy_setup_url.py (http/https only, block private hosts).
 */

import { isIP } from 'node:net'
import { paths } from './paths'

export function hostBlockedForSsrf(host: string): boolean {
  const h = (host || '').trim().toLowerCase()
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h === 'metadata.google.internal' || h === 'metadata' || h === '169.254.169.254') {
    return true
  }
  if (isIP(h)) {
    return isPrivateOrReservedIp(h)
  }
  return false
}

function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 private / loopback / link-local / CGNAT
  if (ip.includes('.')) {
    const parts = ip.split('.').map((p) => Number(p))
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true
    const [a, b] = parts as [number, number, number, number]
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a >= 224) return true
    return false
  }
  // IPv6 — block loopback, link-local, unique-local, unspecified
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true
  return false
}

/** Validate URL for server-side fetch. Returns { url } or { error }. */
export function normalizePublicHttpUrl(
  raw: string,
): { url: string } | { error: string } | { empty: true } {
  const s = (raw || '').trim()
  if (!s) return { empty: true }
  let parsed: URL
  try {
    parsed = new URL(s)
  } catch {
    return { error: 'Invalid URL.' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http and https URLs are allowed.' }
  }
  if (!parsed.hostname) {
    return { error: 'Invalid URL host.' }
  }
  if (hostBlockedForSsrf(parsed.hostname)) {
    return { error: 'URL host is not allowed.' }
  }
  if (parsed.username || parsed.password) {
    return { error: 'URLs with credentials are not allowed.' }
  }
  return { url: s }
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

/**
 * GET url with size/time caps. Returns plain text or null on recoverable failure.
 */
export async function fetchWebsitePlainText(
  url: string,
): Promise<{ text: string | null; error: string | null }> {
  const timeoutMs = paths.easySetupUrlFetchTimeoutMs
  const maxBytes = paths.easySetupUrlMaxResponseBytes
  const maxChars = paths.easySetupUrlMaxTextChars

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': paths.easySetupUrlUserAgent,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      return { text: null, error: `HTTP ${res.status}` }
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > maxBytes) {
      return { text: null, error: 'Response too large' }
    }
    const raw = new TextDecoder('utf-8').decode(buf)
    const plain = htmlToPlainText(raw).slice(0, maxChars)
    return { text: plain || null, error: plain ? null : 'Empty page text' }
  } catch (error) {
    return {
      text: null,
      error: error instanceof Error ? error.message : 'Fetch failed',
    }
  }
}
