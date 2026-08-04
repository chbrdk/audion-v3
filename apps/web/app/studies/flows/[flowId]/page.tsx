import Link from 'next/link'
import { Alert, Chip, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../../components/app-shell'
import { UxFlowDetailClient } from '../../../../components/ux-flow-canvas'
import { getUxTestFlow } from '../../../../lib/ux-test-flows'
import { paths } from '../../../../lib/paths'

export default async function StudiesFlowDetailPage({
  params,
}: {
  params: Promise<{ flowId: string }>
}) {
  const { flowId } = await params
  const flow = getUxTestFlow(flowId)
  if (!flow) {
    return (
      <AppShell title="Flow" description="Not found">
        <Alert tone="error">Unknown flow.</Alert>
        <Link href={paths.routes.studiesFlows}>Back to flows</Link>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={flow.name}
      description={flow.description}
      status={
        <TopStatus
          level={flow.compileReady ? 'ok' : 'warn'}
          primary={flow.compileReady ? 'compile-ready' : 'catalog'}
          secondary={`Szenario ${flow.scenarioIndex}`}
        />
      }
    >
      <p className="audion-flow-lede">
        <Link href={paths.routes.studiesFlows}>← Flows</Link>
        {' · '}
        <Chip size="sm" static>
          {flow.primaryArchetype}
        </Chip>
      </p>

      <UxFlowDetailClient flow={flow} />
    </AppShell>
  )
}
