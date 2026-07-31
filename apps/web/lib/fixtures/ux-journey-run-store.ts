/**
 * UX journey run persistence facade (Postgres when DATABASE_URL, else memory).
 */

import { isProjectsDatabaseConfigured } from '../db/config'
import type { UxJourneyRunRecord } from '../db/ux-journey-runs'

type Store = { byJobId: Map<string, UxJourneyRunRecord> }

const g = globalThis as unknown as { __audionUxJourneyRunStore?: Store }

function store(): Store {
  if (!g.__audionUxJourneyRunStore) {
    g.__audionUxJourneyRunStore = { byJobId: new Map() }
  }
  return g.__audionUxJourneyRunStore
}

async function dbApi() {
  return import('../db/ux-journey-runs')
}

export function resetUxJourneyRunStore(): void {
  store().byJobId.clear()
}

export async function storeUpsertUxJourneyRun(
  input: Parameters<typeof import('../db/ux-journey-runs').dbUpsertUxJourneyRun>[0],
): Promise<UxJourneyRunRecord> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUpsertUxJourneyRun(input)
  }
  const prev = store().byJobId.get(input.jobId)
  const next: UxJourneyRunRecord = {
    id: prev?.id ?? input.id ?? `uxrun-${input.jobId}`,
    personaId: input.personaId,
    jobId: input.jobId,
    task: input.task,
    siteUrl: input.siteUrl,
    success: input.success ?? prev?.success ?? null,
    stepsCount: input.stepsCount ?? prev?.stepsCount ?? 0,
    scorecard: input.scorecard !== undefined ? (input.scorecard ?? null) : (prev?.scorecard ?? null),
    steps: input.steps ?? prev?.steps ?? [],
    derivedJourneyId:
      input.derivedJourneyId !== undefined
        ? (input.derivedJourneyId ?? null)
        : (prev?.derivedJourneyId ?? null),
    projectId: input.projectId !== undefined ? (input.projectId ?? null) : (prev?.projectId ?? null),
    updatedAt: new Date().toISOString(),
    createdAt: prev?.createdAt ?? new Date().toISOString(),
  }
  store().byJobId.set(input.jobId, next)
  return next
}

export async function storeGetUxJourneyRunByJobId(
  jobId: string,
): Promise<UxJourneyRunRecord | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetUxJourneyRunByJobId(jobId)
  }
  return store().byJobId.get(jobId) ?? null
}

export async function storeMarkUxJourneyRunDerivedJourney(
  jobId: string,
  journeyId: string,
): Promise<UxJourneyRunRecord | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbMarkUxJourneyRunDerivedJourney(jobId, journeyId)
  }
  const current = store().byJobId.get(jobId)
  if (!current) return null
  const next = { ...current, derivedJourneyId: journeyId, updatedAt: new Date().toISOString() }
  store().byJobId.set(jobId, next)
  return next
}
