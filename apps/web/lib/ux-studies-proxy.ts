/** Optional live proxy from Next /api/studies* → AUDION-v2 /ux-studies*. */

import { NextResponse } from 'next/server'
import { getPersonaBackendBase, shouldUsePersonaFixturesOnly } from './runtime-config'
import { paths } from './paths'

export function shouldProxyUxStudiesToApi(): boolean {
  if (shouldUsePersonaFixturesOnly()) return false
  return process.env.NEXT_PERSONA_DATA_SOURCE === 'api'
}

export async function proxyUxStudiesToApi(
  request: Request,
  upstreamPath: string,
): Promise<Response> {
  const base = getPersonaBackendBase({ preferPublic: false })
  const url = new URL(request.url)
  const target = `${base}${upstreamPath}${url.search}`
  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }
  try {
    const res = await fetch(target, init)
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'UX studies upstream unavailable',
        detail: error instanceof Error ? error.message : 'unknown',
        hint: `Set ${paths.envPersonaBackendInternal} or use fixtures`,
      },
      { status: 502 },
    )
  }
}

/** Map Next /api/studies... path → /ux-studies... */
export function mapStudiesApiPath(pathname: string): string {
  const marker = '/api/studies'
  const idx = pathname.indexOf(marker)
  const rest = idx >= 0 ? pathname.slice(idx + marker.length) : pathname
  return `/ux-studies${rest}`
}

export async function proxyUxStudiesRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)
  return proxyUxStudiesToApi(request, mapStudiesApiPath(pathname))
}
