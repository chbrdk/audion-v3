import { AppShell } from '../components/app-shell'
import { HomeMagazine } from '../components/home-magazine'
import { fetchJourneyList } from '../lib/journeys'
import { fetchPersonaList } from '../lib/personas'
import { fetchProjectList } from '../lib/projects'
import { fetchTargetGroupList } from '../lib/target-groups'

/** Avoid SSG hitting Postgres/API when Coolify injects env at build time. */
export const dynamic = 'force-dynamic'

async function safeItems<T>(
  load: () => Promise<{ items: T[] }>,
): Promise<T[]> {
  try {
    const result = await load()
    return result.items
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [personas, projects, targetGroups, journeys] = await Promise.all([
    safeItems(fetchPersonaList),
    safeItems(fetchProjectList),
    safeItems(fetchTargetGroupList),
    safeItems(fetchJourneyList),
  ])

  return (
    <AppShell>
      <HomeMagazine
        personas={personas}
        projects={projects}
        targetGroups={targetGroups}
        journeys={journeys}
      />
    </AppShell>
  )
}
