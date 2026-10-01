import { NextResponse } from 'next/server'
import type { PersonaWritePayload } from '@audion-v3/contracts'
import { storeCreatePersona, storePersonaList } from '../../../lib/fixtures/persona-store'
import { storeSeedDefaultNaturalVoice } from '../../../lib/fixtures/persona-prompts-store'
import { personaRecordMatchesQuery } from '../../../lib/persona-name-match'
import { filterPersonasForViewer } from '../../../lib/project-access'
import { requireProjectAccess, requireViewer } from '../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'
import { syncPersonaBeyAgent } from '../../../lib/bey/sync'
import { syncPersonaTavusPal } from '../../../lib/tavus/sync'

/**
 * List personas for hub + Plexon assistant MCP (`audion.personas_list`).
 * Query: `project_id`|`projectId`, `q`|`search`|`name` (fuzzy), `page`, `page_size`|`pageSize`.
 */
export async function GET(request: Request) {
  const gate = await requireViewer(request)
  if (!gate.ok) return gate.response

  const url = new URL(request.url)
  const projectId =
    url.searchParams.get('project_id')?.trim() ||
    url.searchParams.get('projectId')?.trim() ||
    ''
  const q =
    url.searchParams.get('q')?.trim() ||
    url.searchParams.get('search')?.trim() ||
    url.searchParams.get('name')?.trim() ||
    ''
  const pageRaw = Number(url.searchParams.get('page') || '1')
  const pageSizeRaw = Number(
    url.searchParams.get('page_size') || url.searchParams.get('pageSize') || '100',
  )
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const pageSize = Math.min(
    200,
    Math.max(1, Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.floor(pageSizeRaw) : 100),
  )

  if (isPlexonAuthConfigured() && projectId) {
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  }

  const list = await storePersonaList()
  let items = list.items

  if (projectId) {
    items = items.filter((p) => p.projectId === projectId)
  } else if (isPlexonAuthConfigured() && gate.viewerId) {
    items = await filterPersonasForViewer(items, gate.viewerId)
  }

  if (q) {
    items = items.filter((p) => personaRecordMatchesQuery(p, q))
  }

  const total = items.length
  const start = (page - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return NextResponse.json({
    items: pageItems,
    total,
    page,
    page_size: pageSize,
    pageSize,
    query: q || undefined,
    project_id: projectId || undefined,
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as PersonaWritePayload & { project_id?: string }
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // MCP / FastAPI-era clients send project_id; contracts use projectId (parity with target-groups).
  const projectId =
    (typeof body.projectId === 'string' ? body.projectId.trim() : '') ||
    (typeof body.project_id === 'string' ? body.project_id.trim() : '')
  if (isPlexonAuthConfigured()) {
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    const access = await requireProjectAccess(request, projectId)
    if (!access.ok) return access.response
  } else {
    const gate = await requireViewer(request)
    if (!gate.ok) return gate.response
  }

  const persona = await storeCreatePersona({
    ...body,
    projectId: projectId || body.projectId || null,
    role: body.role?.trim() || 'Persona',
  })
  await storeSeedDefaultNaturalVoice(persona.id)
  const tavus = await syncPersonaTavusPal(persona)
  const bey = await syncPersonaBeyAgent(tavus.persona)
  return NextResponse.json(bey.persona, { status: 201 })
}
