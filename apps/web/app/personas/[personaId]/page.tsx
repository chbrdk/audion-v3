import { notFound, redirect } from 'next/navigation'
import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { PersonaDetailPanel } from '../../../components/persona-detail-panel'
import { entityRouteKey } from '../../../lib/entity-slug'
import { fetchPersonaDetail } from '../../../lib/personas'
import { paths } from '../../../lib/paths'

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>
}) {
  const { personaId } = await params
  let detailResult: Awaited<ReturnType<typeof fetchPersonaDetail>>
  try {
    detailResult = await fetchPersonaDetail(personaId)
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">{error instanceof Error ? error.message : 'Persona backend unavailable.'}</Alert>
      </AppShell>
    )
  }
  if (!detailResult.persona) notFound()
  const canonical = entityRouteKey(detailResult.persona)
  if (canonical !== personaId) {
    redirect(paths.routes.personaDetail(canonical))
  }
  return (
    <AppShell>
      <PersonaDetailPanel persona={detailResult.persona} />
    </AppShell>
  )
}
