/**
 * Process-local behavioral gold observation ledger (Phase 6).
 * Spec: behavioral-gold-scoreboard.md
 */

import type { BehavioralGoldObservation } from '@audion-v3/contracts'
import {
  aggregatePolicyScoreboard,
  listPolicyScoreboards,
  type BehavioralGoldBand,
} from './gold-scoreboard'

type Store = {
  observations: BehavioralGoldObservation[]
}

const g = globalThis as unknown as { __audionBehavioralGoldStore?: Store }
const CAP = 2000

function store(): Store {
  if (!g.__audionBehavioralGoldStore) {
    g.__audionBehavioralGoldStore = { observations: [] }
  }
  return g.__audionBehavioralGoldStore
}

export function resetBehavioralGoldStore(): void {
  store().observations = []
}

export function listBehavioralGoldObservations(policyId?: string | null): BehavioralGoldObservation[] {
  const all = store().observations
  const id = policyId?.trim()
  if (!id) return [...all]
  return all.filter((o) => o.policyId === id)
}

export function recordBehavioralGoldObservation(
  observation: BehavioralGoldObservation,
): BehavioralGoldObservation {
  const s = store()
  s.observations = [observation, ...s.observations].slice(0, CAP)
  return observation
}

export function getBehavioralPolicyScoreboard(
  policyId: string,
  band?: BehavioralGoldBand,
) {
  return aggregatePolicyScoreboard(policyId, store().observations, band)
}

export function listBehavioralPolicyScoreboards(band?: BehavioralGoldBand) {
  return listPolicyScoreboards(store().observations, band)
}
