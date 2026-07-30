import { NextResponse } from 'next/server'
import { paths } from '../../../lib/paths'

/** Coolify / Traefik health probe — no auth. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'audion-v3',
    login: paths.routes.login,
  })
}
