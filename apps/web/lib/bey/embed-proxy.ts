/**
 * Beyond Presence bey.chat same-origin embed proxy.
 * Spec: specs/domain/bey-video-chat.md § Embed proxy
 */

import { paths } from '../paths'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-encoding',
  'content-length',
])

/** Firebase / Google hosts the Bey SPA calls; browser referer must look like bey.chat. */
export const BEY_GAPI_UPSTREAM: Record<string, string> = {
  identitytoolkit: 'https://identitytoolkit.googleapis.com',
  securetoken: 'https://securetoken.googleapis.com',
  firebaseinstallations: 'https://firebaseinstallations.googleapis.com',
  firebase: 'https://firebase.googleapis.com',
}

export function isBeyEmbedProxyEnabled(): boolean {
  const raw = process.env[paths.envBeyEmbedProxy]?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}

/** Iframe src for Starter-plan BEY — proxied under AUDION by default. */
export function beyChatEmbedUrl(agentId: string): string {
  const id = typeof agentId === 'string' ? agentId.trim() : ''
  if (!id) return isBeyEmbedProxyEnabled() ? paths.beyEmbedProxyPath : paths.beyChatEmbedBase
  if (isBeyEmbedProxyEnabled()) {
    return `${paths.beyEmbedProxyPath}/${encodeURIComponent(id)}`
  }
  return `${paths.beyChatEmbedBase.replace(/\/$/, '')}/${encodeURIComponent(id)}`
}

/**
 * History helper only — do NOT strip location.pathname.
 * The SPA uses createBrowserRouter without basename; we inject basename in
 * rewriteBeyEmbedScript. Stripping pathname would break that basename match.
 */
export function beyEmbedPathShimScript(proxyPath = paths.beyEmbedProxyPath): string {
  const prefix = JSON.stringify(proxyPath.replace(/\/$/, ''))
  return `<script>(function(){var P=${prefix};function add(p){if(typeof p!=="string"||!p)return p;try{var u=new URL(p,location.origin);if(u.origin!==location.origin)return p;var path=u.pathname;if(path!==P&&path.indexOf(P+"/")!==0){u.pathname=P+(path.charAt(0)==="/"?path:"/"+path)}return u.pathname+u.search+u.hash}catch(e){return p}}var push=history.pushState.bind(history),rep=history.replaceState.bind(history);history.pushState=function(s,t,u){return push(s,t,u==null?u:add(String(u)))};history.replaceState=function(s,t,u){return rep(s,t,u==null?u:add(String(u)))};})();</script>`
}

export function rewriteBeyEmbedHtml(html: string, proxyPath = paths.beyEmbedProxyPath): string {
  const prefix = proxyPath.replace(/\/$/, '')
  const prefixSlash = `${prefix}/`
  let out = html
  // Path-absolute assets (/assets/…) would otherwise hit the AUDION origin root.
  // Skip URLs already under the proxy prefix.
  out = out.replace(
    new RegExp(`(href|src|action)=(["'])\\/(?!\\/|${prefix.slice(1)}\\/)`, 'gi'),
    `$1=$2${prefixSlash}`,
  )
  out = out.replaceAll('https://bey.chat/', prefixSlash)
  out = out.replaceAll('http://bey.chat/', prefixSlash)
  out = out.replaceAll('https://bey.chat', prefix)
  out = out.replaceAll('http://bey.chat', prefix)
  const boot = beyEmbedPathShimScript(prefix)
  out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${prefixSlash}" />${boot}`)
  return out
}

export function rewriteBeyEmbedScript(
  body: string,
  opts?: {
    embedProxyPath?: string
    apiProxyPath?: string
    gapiProxyPath?: string
  },
): string {
  const embed = (opts?.embedProxyPath ?? paths.beyEmbedProxyPath).replace(/\/$/, '')
  const api = (opts?.apiProxyPath ?? paths.beyApiProxyPath).replace(/\/$/, '')
  const gapi = (opts?.gapiProxyPath ?? paths.beyGapiProxyPath).replace(/\/$/, '')
  const basenameLiteral = JSON.stringify(embed)
  const gapiLit = JSON.stringify(gapi)
  let out = body
  out = out.replaceAll('https://api.bey.chat', api)
  out = out.replaceAll('https://api-staging.bey.chat', api)
  out = out.replaceAll('https://api-dev.bey.chat', api)
  out = out.replaceAll('https://bey.chat', embed)
  out = out.replaceAll('http://bey.chat', embed)
  // Bey boots with createBrowserRouter(getRouterData(authed)) and routes `/:id`.
  // Under /bey-embed/{id} that matches id="bey-embed" → "Agent Unavailable".
  // Inject basename so /bey-embed/{uuid} resolves the real agent id.
  out = out.replace(
    /createBrowserRouter\(getRouterData\(([^)]*)\)\)/g,
    `createBrowserRouter(getRouterData($1),{basename:${basenameLiteral}})`,
  )
  // Firebase Auth API keys allowlist only bey.chat referrers. Route SDK hosts
  // through our same-origin /bey-gapi proxy (server sets Referer: https://bey.chat/).
  out = out.replaceAll(
    'apiHost:`identitytoolkit.googleapis.com`,tokenApiHost:`securetoken.googleapis.com`',
    `apiHost:location.host+${gapiLit}+"/identitytoolkit",tokenApiHost:location.host+${gapiLit}+"/securetoken"`,
  )
  out = out.replaceAll(
    'INSTALLATIONS_API_URL=`https://firebaseinstallations.googleapis.com/v1`',
    `INSTALLATIONS_API_URL=location.origin+${gapiLit}+"/firebaseinstallations/v1"`,
  )
  out = out.replaceAll(
    'DYNAMIC_CONFIG_URL=`https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig`',
    `DYNAMIC_CONFIG_URL=location.origin+${gapiLit}+"/firebase/v1alpha/projects/-/apps/{app-id}/webConfig"`,
  )
  // Auth SDK rejects non–bey.chat authorizedDomains; skip the hard fail under proxy.
  out = out.replaceAll('_fail(Qc,`unauthorized-domain`)', 'return')
  // Session cookie domain `.bey.chat` cannot be set on the AUDION host.
  out = out.replace(
    'getCookieConfig=()=>{let Qc=`.bey.chat`;return isDev?{name:`__session_dev`,domain:Qc}:isStaging?{name:`__session_staging`,domain:Qc}:{name:`__session`,domain:Qc}}',
    'getCookieConfig=()=>{let Qc=location.hostname;return isDev?{name:`__session_dev`,domain:Qc}:isStaging?{name:`__session_staging`,domain:Qc}:{name:`__session`,domain:Qc}}',
  )
  return out
}

export function filterUpstreamRequestHeaders(headers: Headers): Headers {
  const out = new Headers()
  headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    if (lower === 'cookie') return
    out.set(key, value)
  })
  out.set('accept-encoding', 'identity')
  return out
}

/** Google API key allowlist checks Referer — spoof bey.chat from the edge proxy. */
export function filterBeyGapiRequestHeaders(headers: Headers): Headers {
  const out = filterUpstreamRequestHeaders(headers)
  out.delete('referer')
  out.delete('origin')
  out.set('Referer', `${paths.beyChatEmbedBase}/`)
  out.set('Origin', paths.beyChatEmbedBase)
  return out
}

export function filterUpstreamResponseHeaders(headers: Headers): Headers {
  const out = new Headers()
  headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    if (lower === 'content-security-policy') return
    if (lower === 'content-security-policy-report-only') return
    if (lower === 'x-frame-options') return
    if (lower.startsWith('set-cookie')) return
    out.set(key, value)
  })
  out.set('Cache-Control', 'no-store')
  return out
}

export async function proxyBeyUpstream(input: {
  request: Request
  upstreamBase: string
  pathSegments: string[]
  rewrite?: 'html' | 'script' | 'none'
}): Promise<Response> {
  const base = input.upstreamBase.replace(/\/$/, '')
  const path = input.pathSegments.map((s) => encodeURIComponent(s)).join('/')
  const url = new URL(input.request.url)
  const target = `${base}/${path}${url.search}`

  const init: RequestInit = {
    method: input.request.method,
    headers: filterUpstreamRequestHeaders(input.request.headers),
    redirect: 'manual',
    cache: 'no-store',
  }
  if (input.request.method !== 'GET' && input.request.method !== 'HEAD') {
    init.body = await input.request.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const headers = filterUpstreamResponseHeaders(upstream.headers)
  const contentType = upstream.headers.get('content-type') || ''

  if (input.rewrite === 'html' && contentType.includes('text/html')) {
    const html = rewriteBeyEmbedHtml(await upstream.text())
    headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Response(html, { status: upstream.status, headers })
  }

  if (
    input.rewrite === 'script' &&
    (contentType.includes('javascript') ||
      contentType.includes('ecmascript') ||
      target.endsWith('.js'))
  ) {
    const js = rewriteBeyEmbedScript(await upstream.text())
    headers.set('Content-Type', contentType || 'application/javascript; charset=utf-8')
    return new Response(js, { status: upstream.status, headers })
  }

  return new Response(upstream.body, { status: upstream.status, headers })
}

export async function proxyBeyGapiUpstream(input: {
  request: Request
  pathSegments: string[]
}): Promise<Response> {
  const [service, ...rest] = input.pathSegments
  const base = service ? BEY_GAPI_UPSTREAM[service] : undefined
  if (!base) {
    return new Response(JSON.stringify({ error: 'Unknown Bey Google API service' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // Keep literal colons (e.g. accounts:signUp); do not encodeURIComponent the whole segment.
  const path = rest.map((s) => encodeURIComponent(s).replace(/%3A/gi, ':')).join('/')
  const url = new URL(input.request.url)
  const target = `${base}/${path}${url.search}`

  const init: RequestInit = {
    method: input.request.method,
    headers: filterBeyGapiRequestHeaders(input.request.headers),
    redirect: 'manual',
    cache: 'no-store',
  }
  if (input.request.method !== 'GET' && input.request.method !== 'HEAD') {
    init.body = await input.request.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const headers = filterUpstreamResponseHeaders(upstream.headers)
  return new Response(upstream.body, { status: upstream.status, headers })
}
