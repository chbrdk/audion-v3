import { Alert, TopStatus } from '@msqdx/ui'
import Link from 'next/link'
import { AppShell } from '../../../components/app-shell'
import { StudyDetailPanel } from '../../../components/study-detail-panel'
import { fetchUxStudyDetail } from '../../../lib/ux-studies'
import { paths } from '../../../lib/paths'

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ studyId: string }>
}) {
  const { studyId } = await params
  try {
    const { study } = await fetchUxStudyDetail(studyId)
    if (!study) {
      return (
        <AppShell title="Study" description="Not found">
          <Alert tone="error">Study not found.</Alert>
          <Link href={paths.routes.studies}>Back to studies</Link>
        </AppShell>
      )
    }
    return (
      <AppShell
        title={study.name}
        status={
          <TopStatus
            level="ok"
            primary={`${study.waveCount} waves`}
          />
        }
      >
        <StudyDetailPanel study={study} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Study">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Failed to load study.'}
        </Alert>
      </AppShell>
    )
  }
}
