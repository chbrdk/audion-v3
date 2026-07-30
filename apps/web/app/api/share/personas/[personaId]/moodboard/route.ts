import { NextResponse } from 'next/server'
import { storeShareMoodboard } from '../../../../../../lib/fixtures/chat-share'
import { fetchPersonaApi, shouldPreferAiLive, shouldRequireAiLive } from '../../../../../../lib/persona-api-proxy'

type Params = { params: Promise<{ personaId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { personaId } = await params
  const projectId = new URL(request.url).searchParams.get('projectId')

  if (shouldPreferAiLive()) {
    const authorization = request.headers.get('authorization')
    const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    const live = await fetchPersonaApi(`/personas/${personaId}/moodboards/public${qs}`, {
      method: 'GET',
      authorization,
    })
    if (live.ok) {
      const json = (live.json ?? {}) as Record<string, unknown>
      const tiles = Array.isArray(json.tiles) ? json.tiles : []
      return NextResponse.json({
        personaId,
        projectId: projectId,
        styleKeywords: Array.isArray(json.style_keywords)
          ? json.style_keywords
          : Array.isArray(json.styleKeywords)
            ? json.styleKeywords
            : [],
        tiles: tiles.map((t: Record<string, unknown>, i: number) => ({
          id: String(t.id ?? `tile-${i}`),
          imageUrl: String(t.image_url ?? t.imageUrl ?? ''),
          category: (t.category as string) ?? null,
          caption: (t.caption as string) ?? null,
        })),
      })
    }
    if (shouldRequireAiLive()) {
      return NextResponse.json(
        { error: live.error, detail: live.detail },
        { status: live.status },
      )
    }
  }

  const result = storeShareMoodboard(personaId, projectId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
