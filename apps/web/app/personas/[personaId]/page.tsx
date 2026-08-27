import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { PersonaDetailPanel } from '../../../components/persona-detail-panel'
import { fetchPersonaDetail } from '../../../lib/personas'

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>
}) {
  const { personaId } = await params
  try {
    const detailResult = await fetchPersonaDetail(personaId)
    return (
      <AppShell>
        <PersonaDetailPanel persona={detailResult.persona} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">{error instanceof Error ? error.message : 'Persona backend unavailable.'}</Alert>
      </AppShell>
    )
  }
}
