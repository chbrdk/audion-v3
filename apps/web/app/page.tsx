import Link from 'next/link'
import { Panel, Text } from '@msqdx/ui'
import { AppShell } from '../components/app-shell'
import { paths } from '../lib/paths'

export default function HomePage() {
  return (
    <AppShell
      title="Workspace Home"
      description="Thin AUDION v3 shell with the first persona-management slice."
      actions={
        <>
          <Link href={paths.routes.setup} className="audion-link">
            Easy setup
          </Link>
          <Link href={paths.routes.personas} className="audion-link">
            Open first slice
          </Link>
        </>
      }
    >
      <Panel className="audion-stack">
        <Text role="headline" as="h2">
          Persona Workspace
        </Text>
        <Text role="body">
          AUDION v3 starts with a focused persona slice built against the existing backend.
        </Text>
        <Text role="meta">
          New here? Use{' '}
          <Link href={paths.routes.setup} className="audion-link">
            Easy setup
          </Link>{' '}
          to create a project, target group, and persona in one step.
        </Text>
      </Panel>
    </AppShell>
  )
}
