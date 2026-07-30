/**
 * In-memory journey validation report history (fixtures).
 * Spec: knowledge/journey-phase-ai-validate-2026.md
 */

import type {
  JourneyValidationReport,
  JourneyValidationReportList,
  JourneyValidationReportSummary,
  ValidateJourneyResponse,
} from '@audion-v3/contracts'

const MAX_REPORTS_PER_JOURNEY = 20

type Store = {
  byJourney: Map<string, JourneyValidationReport[]>
}

const g = globalThis as unknown as { __audionJourneyValidationStore?: Store }

function store(): Store {
  if (!g.__audionJourneyValidationStore) {
    g.__audionJourneyValidationStore = { byJourney: new Map() }
  }
  return g.__audionJourneyValidationStore
}

function newReportId(): string {
  return `val-report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function toSummary(report: JourneyValidationReport): JourneyValidationReportSummary {
  return {
    id: report.reportId,
    journeyId: report.journeyId,
    personaId: report.personaId,
    mode: report.mode,
    overallFitScore: report.overallFitScore,
    validatedAt: report.validatedAt,
    stubbed: Boolean(report.stubbed),
  }
}

export function resetJourneyValidationStore(): void {
  store().byJourney.clear()
}

export function storeAppendValidationReport(
  response: Omit<ValidateJourneyResponse, 'reportId'> & { reportId?: string },
): JourneyValidationReport {
  const report: JourneyValidationReport = {
    ...response,
    reportId: response.reportId?.trim() || newReportId(),
  }
  const list = store().byJourney.get(report.journeyId) ?? []
  const next = [report, ...list].slice(0, MAX_REPORTS_PER_JOURNEY)
  store().byJourney.set(report.journeyId, next)
  return report
}

export function storeListValidationReports(journeyId: string): JourneyValidationReportList {
  const items = (store().byJourney.get(journeyId) ?? []).map(toSummary)
  return { items, total: items.length }
}

export function storeGetValidationReport(
  journeyId: string,
  reportId: string,
): JourneyValidationReport | null {
  const list = store().byJourney.get(journeyId) ?? []
  return list.find((r) => r.reportId === reportId) ?? null
}

export function storeLatestValidationReport(journeyId: string): JourneyValidationReport | null {
  return store().byJourney.get(journeyId)?.[0] ?? null
}
