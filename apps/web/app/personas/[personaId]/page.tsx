import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { PersonaDetailPanel } from '../../../components/persona-detail-panel'
import { storeTargetGroupForPersona } from '../../../lib/fixtures/target-group-store'
import { fetchPersonaDetail } from '../../../lib/personas'
import { paths } from '../../../lib/paths'

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>
}) {
  const { personaId } = await params
  try {
    const detailResult = await fetchPersonaDetail(personaId)
    const demo = detailResult.origin === 'fixtures'
    const targetGroup = await storeTargetGroupForPersona(personaId)
    const title = targetGroup?.name ?? 'Personas'
    return (
      <AppShell
        title={title}
        titleTone="context"
        titleHref={targetGroup ? paths.routes.targetGroupDetail(targetGroup.id) : paths.routes.personas}
        status={
          <TopStatus
            level="ok"
            primary={demo ? 'demo data' : 'persona'}
            secondary={demo ? 'fixtures' : 'live'}
          />
        }
      >
        <PersonaDetailPanel persona={detailResult.persona} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Personas" titleTone="context" titleHref={paths.routes.personas}>
        <Alert tone="error">{error instanceof Error ? error.message : 'Persona backend unavailable.'}</Alert>
      </AppShell>
    )
  }
}
