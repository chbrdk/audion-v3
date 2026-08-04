import Link from 'next/link'
import { Alert, Chip, Panel, Text, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../../components/app-shell'
import { CreateStudyFromFlowButton } from '../../../../components/create-study-from-flow-button'
import { flattenFlowBlocks, getUxTestFlow } from '../../../../lib/ux-test-flows'
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

  const blocks = flattenFlowBlocks(flow)

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

      <CreateStudyFromFlowButton
        flowId={flow.id}
        flowName={flow.name}
        disabled={!flow.compileReady}
      />

      <section className="audion-flow-blocks">
        <Text role="headline" as="h2">
          Blockliste
        </Text>
        {!blocks.length ? (
          <Alert tone="info">
            Noch kein vollständiger Graph — nur Katalog-Metadaten. Bausteine:{' '}
            {flow.nodeKindsUsed.join(', ')}.
          </Alert>
        ) : (
          <ol className="audion-flow-block-list">
            {blocks.map(({ node, branch, depth }) => (
              <li
                key={`${node.id}-${branch}-${depth}`}
                className="audion-flow-block"
                style={{ marginLeft: `${depth * 1.25}rem` }}
              >
                <Panel as="div" variant="card" className="audion-flow-block-panel">
                  <p className="audion-flow-block-meta">
                    <Chip size="sm" static>
                      {node.kind}
                    </Chip>
                    {branch && branch !== 'main' ? (
                      <Chip size="sm" static>
                        {branch === 'when' ? 'wenn' : 'sonst'}
                      </Chip>
                    ) : null}
                    {node.gateCondition ? (
                      <Chip size="sm" static>
                        {node.gateCondition}
                      </Chip>
                    ) : null}
                  </p>
                  <Text role="headline" as="h3">
                    {node.label}
                  </Text>
                  {node.text ? <p className="audion-flow-block-text">{node.text}</p> : null}
                  {node.urlKey ? (
                    <p className="audion-tg-card-meta">urlKey: {node.urlKey}</p>
                  ) : null}
                  {node.pattern ? (
                    <p className="audion-tg-card-meta">pattern: {node.pattern}</p>
                  ) : null}
                </Panel>
              </li>
            ))}
          </ol>
        )}
      </section>
    </AppShell>
  )
}
