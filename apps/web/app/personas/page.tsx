import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
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
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title="Personas"
        description={demo ? 'Demo fixtures — API offline.' : undefined}
        status={
          <TopStatus
            level="ok"
            primary={demo ? 'demo data' : `${list.total} personas`}
            secondary={demo ? `${list.total} fixtures` : 'live'}
          />
        }
      >
        <PersonaListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Personas" description="Browse personas against the existing backend.">
        <Alert tone="error">{error instanceof Error ? error.message : 'Persona backend unavailable.'}</Alert>
      </AppShell>
    )
  }
}
