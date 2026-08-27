import { Alert } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { HubTopStatus } from '../../components/hub-top-status'
import { PersonaListPanel } from '../../components/persona-list-panel'
import { fetchPersonaList, filterPersonaList } from '../../lib/personas'

export default async function PersonasPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const params = (await searchParams) || {}
  const query = typeof params.q === 'string' ? params.q : ''
  try {
    const result = await fetchPersonaList()
    const list = filterPersonaList(result, query)
    return (
      <AppShell
        status={<HubTopStatus total={list.total} entity="personas" />}
      >
        <PersonaListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell descriptionKey="pages.personas.lead">
        <Alert tone="error">{error instanceof Error ? error.message : 'Persona backend unavailable.'}</Alert>
      </AppShell>
    )
  }
}
