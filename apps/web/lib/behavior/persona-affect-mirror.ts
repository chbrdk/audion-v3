/**
 * Last-known affect per persona — bridges chat ↔ video within a process,
 * and seeds video when chat session was on another replica (best-effort).
 */

import type { BehavioralSessionState } from '@audion-v3/contracts'

type Store = {
  byPersonaId: Map<string, BehavioralSessionState>
}

const g = globalThis as unknown as { __audionPersonaAffectMirror?: Store }

function store(): Store {
  if (!g.__audionPersonaAffectMirror) {
    g.__audionPersonaAffectMirror = { byPersonaId: new Map() }
  }
  return g.__audionPersonaAffectMirror
}

export function resetPersonaAffectMirror(): void {
  store().byPersonaId.clear()
}

export function mirrorPersonaAffect(
  personaId: string,
  state: BehavioralSessionState,
): void {
  const id = personaId.trim()
  if (!id) return
  store().byPersonaId.set(id, { ...state, surface: state.surface })
}

export function readPersonaAffect(personaId: string): BehavioralSessionState | null {
  return store().byPersonaId.get(personaId.trim()) ?? null
}
