import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './auth'
import { isPlexonAuthConfigured } from './lib/plexon-auth'
import { paths } from './lib/paths'

function isAudionApiBearer(authorization: string | null): boolean {
  if (!authorization) return false
  const trimmed = authorization.trim()
  const prefix = `Bearer ${paths.apiTokenPrefix}`
  return trimmed.toLowerCase().startsWith(prefix.toLowerCase())
}

function rawAudionToken(authorization: string): string {
  return authorization.trim().replace(/^Bearer\s+/i, '').trim()
}

/**
 * Accept machine/env token immediately; otherwise ask Node verify route
 * (fixture UI tokens live in the Node process store, not Edge).
 */
async function isValidAudionApiBearer(
  req: NextRequest,
  authorization: string,
): Promise<boolean> {
  const raw = rawAudionToken(authorization)
  const envTok = process.env[paths.audionApiTokenEnvKey]?.trim()
  if (envTok && raw === envTok) return true

  if (req.nextUrl.pathname === paths.routes.apiSettingsTokenVerify) {
    return true
  }

  try {
    const verifyUrl = new URL(paths.routes.apiSettingsTokenVerify, req.nextUrl.origin)
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { authorization },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

const gated = auth(async (req) => {
  const { pathname } = req.nextUrl
  const isPublic =
    pathname === paths.routes.login ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/platform/provisioning') ||
    pathname === paths.routes.apiSettingsTokenVerify ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fixtures') ||
    pathname === '/favicon.ico'

  if (isPublic) {
    return NextResponse.next()
  }

  const authorization = req.headers.get('authorization')
  if (pathname.startsWith('/api/') && isAudionApiBearer(authorization)) {
    const ok = await isValidAudionApiBearer(req, authorization!)
    if (ok) return NextResponse.next()
    return NextResponse.json({ error: 'Invalid API token' }, { status: 401 })
  }

  if (!req.auth) {
    const login = new URL(paths.routes.login, req.nextUrl.origin)
    login.searchParams.set('redirect', pathname)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
})

/** Open when Plexon unset; protect app routes when federated. */
export default function middleware(req: NextRequest) {
  if (!isPlexonAuthConfigured()) {
    return NextResponse.next()
  }
  return gated(req, {} as never)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
