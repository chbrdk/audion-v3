import { Alert, TopStatus } from '@msqdx/ui'
import Link from 'next/link'
import { AppShell } from '../../../../../components/app-shell'
import { WaveDetailPanel } from '../../../../../components/wave-detail-panel'
import { fetchUxStudyDetail, fetchUxWaveCompare, fetchUxWaveDetail } from '../../../../../lib/ux-studies'
import { paths } from '../../../../../lib/paths'

export default async function StudyWavePage({
  params,
}: {
  params: Promise<{ studyId: string; waveId: string }>
}) {
  const { studyId, waveId } = await params
  try {
    const [{ study }, { wave }, { delta }] = await Promise.all([
      fetchUxStudyDetail(studyId),
      fetchUxWaveDetail(studyId, waveId),
      fetchUxWaveCompare(studyId, waveId, waveId),
    ])
    if (!study || !wave) {
      return (
        <AppShell description="Not found">
          <Alert tone="error">Wave not found.</Alert>
          <Link href={paths.routes.studyDetail(studyId)}>Back to study</Link>
        </AppShell>
      )
    }
    return (
      <AppShell
        description={study.name}
        status={
          <TopStatus
            level="ok"
            primary={wave.status}
            secondary={`${wave.validEvidenceCount}/${wave.runCount} valid`}
          />
        }
      >
        <WaveDetailPanel study={study} wave={wave} selfCompare={delta} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Failed to load wave.'}
        </Alert>
      </AppShell>
    )
  }
}
