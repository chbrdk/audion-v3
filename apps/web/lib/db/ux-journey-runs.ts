import { and, desc, eq } from 'drizzle-orm'
import { getDb } from './client'
import { personaUxJourneyRuns, type PersonaUxJourneyRunRow } from './schema'

export type UxJourneyRunRecord = {
  id: string
  personaId: string
  jobId: string
  task: string
  siteUrl: string
  success: boolean | null
  stepsCount: number
  scorecard: Record<string, unknown> | null
  steps: unknown[]
  derivedJourneyId: string | null
  projectId: string | null
  updatedAt: string
  createdAt: string
}

function rowToRecord(row: PersonaUxJourneyRunRow): UxJourneyRunRecord {
  return {
    id: row.id,
    personaId: row.personaId,
    jobId: row.jobId,
    task: row.task,
    siteUrl: row.siteUrl,
    success: row.success == null ? null : row.success === 'true' || row.success === '1',
    stepsCount: row.stepsCount,
    scorecard: row.scorecard ?? null,
    steps: Array.isArray(row.steps) ? row.steps : [],
    derivedJourneyId: row.derivedJourneyId ?? null,
    projectId: row.projectId ?? null,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export async function dbUpsertUxJourneyRun(input: {
  id?: string
  personaId: string
  jobId: string
  task: string
  siteUrl: string
  success?: boolean | null
  stepsCount?: number
  scorecard?: Record<string, unknown> | null
  steps?: unknown[]
  projectId?: string | null
  derivedJourneyId?: string | null
}): Promise<UxJourneyRunRecord> {
  const db = getDb()
  const existing = await db
    .select()
    .from(personaUxJourneyRuns)
    .where(
      and(
        eq(personaUxJourneyRuns.personaId, input.personaId),
        eq(personaUxJourneyRuns.jobId, input.jobId),
      ),
    )
    .limit(1)
  const id = existing[0]?.id ?? input.id ?? `uxrun-${input.jobId}`
  const values = {
    id,
    personaId: input.personaId,
    jobId: input.jobId,
    task: input.task,
    siteUrl: input.siteUrl,
    success:
      input.success === undefined || input.success === null
        ? (existing[0]?.success ?? null)
        : input.success
          ? 'true'
          : 'false',
    stepsCount: input.stepsCount ?? existing[0]?.stepsCount ?? 0,
    scorecard: input.scorecard !== undefined ? input.scorecard : (existing[0]?.scorecard ?? null),
    steps: input.steps ?? existing[0]?.steps ?? [],
    projectId: input.projectId !== undefined ? input.projectId : (existing[0]?.projectId ?? null),
    derivedJourneyId:
      input.derivedJourneyId !== undefined
        ? input.derivedJourneyId
        : (existing[0]?.derivedJourneyId ?? null),
    updatedAt: new Date(),
  }
  if (existing[0]) {
    await db
      .update(personaUxJourneyRuns)
      .set(values)
      .where(eq(personaUxJourneyRuns.id, id))
  } else {
    await db.insert(personaUxJourneyRuns).values({
      ...values,
      createdAt: new Date(),
    })
  }
  const rows = await db
    .select()
    .from(personaUxJourneyRuns)
    .where(eq(personaUxJourneyRuns.id, id))
    .limit(1)
  return rowToRecord(rows[0]!)
}

export async function dbGetUxJourneyRunByJobId(
  jobId: string,
): Promise<UxJourneyRunRecord | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(personaUxJourneyRuns)
    .where(eq(personaUxJourneyRuns.jobId, jobId))
    .limit(1)
  return rows[0] ? rowToRecord(rows[0]) : null
}

export async function dbListUxJourneyRunsForPersona(
  personaId: string,
): Promise<UxJourneyRunRecord[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(personaUxJourneyRuns)
    .where(eq(personaUxJourneyRuns.personaId, personaId))
    .orderBy(desc(personaUxJourneyRuns.updatedAt))
  return rows.map(rowToRecord)
}

export async function dbMarkUxJourneyRunDerivedJourney(
  jobId: string,
  journeyId: string,
): Promise<UxJourneyRunRecord | null> {
  const current = await dbGetUxJourneyRunByJobId(jobId)
  if (!current) return null
  return dbUpsertUxJourneyRun({
    ...current,
    derivedJourneyId: journeyId,
  })
}
