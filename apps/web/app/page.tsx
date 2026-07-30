import Link from 'next/link'
import { Panel, Text } from '@msqdx/ui'
import { AppShell } from '../components/app-shell'

export default function HomePage() {
  return (
    <AppShell
      title="Workspace Home"
      description="Thin AUDION v3 shell with the first persona-management slice."
      actions={<Link href="/personas" className="audion-link">Open first slice</Link>}
    >
      <Panel className="audion-stack">
        <Text role="headline" as="h2">Persona Workspace</Text>
        <Text role="body">AUDION v3 starts with a focused persona slice built against the existing backend.</Text>
        <Text role="meta">Next areas are intentionally placeholder-only until the persona slice is stable.</Text>
      </Panel>
    </AppShell>
  )
}
