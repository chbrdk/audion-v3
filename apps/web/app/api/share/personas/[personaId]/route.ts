import { NextResponse } from 'next/server'
import { storeSharePersona } from '../../../../../lib/fixtures/chat-share'
import { fetchPersonaApi, shouldPreferAiLive, shouldRequireAiLive } from '../../../../../lib/persona-api-proxy'

type Params = { params: Promise<{ personaId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { personaId } = await params
  const projectId = new URL(request.url).searchParams.get('projectId')

  if (shouldPreferAiLive()) {
    const authorization = request.headers.get('authorization')
    const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    const live = await fetchPersonaApi(`/personas/${personaId}/public${qs}`, {
      method: 'GET',
      authorization,
    })
    if (live.ok) {
      const json = (live.json ?? {}) as Record<string, unknown>
      return NextResponse.json({
        id: json.id ?? personaId,
        name: json.name ?? 'Persona',
        role: json.role ?? json.headline ?? '',
        projectId: json.project_id ?? json.projectId ?? projectId,
        avatarUrl: json.avatar_url ?? json.avatarUrl ?? null,
        bio: json.bio ?? null,
      })
    }
    if (shouldRequireAiLive()) {
      return NextResponse.json(
        { error: live.error, detail: live.detail },
        { status: live.status },
      )
    }
  }

  const result = storeSharePersona(personaId, projectId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
