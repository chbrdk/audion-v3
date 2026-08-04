/**
 * Map Persona Lab fixture persona ids → staging/local DB persona ids.
 * from-pack materialization uses this so Start gets full traits (time_pressure),
 * not `{ id }` stubs. Env overrides beat path defaults.
 *
 * @see knowledge/persona-lab-persona-resolve-2026-08-04.md
 */

import { paths } from './paths'

export type LabPersonaAlias =
  | typeof paths.personaLabImpatientPersonaId
  | typeof paths.personaLabPatientPersonaId

/** Fixture alias → documented staging DB id (paths defaults). */
export const LAB_PERSONA_FIXTURE_TO_DB: Record<string, string> = {
  [paths.personaLabImpatientPersonaId]: paths.personaLabImpatientDbPersonaId,
  [paths.personaLabPatientPersonaId]: paths.personaLabPatientDbPersonaId,
  // Already-DB ids resolve to themselves
  [paths.personaLabImpatientDbPersonaId]: paths.personaLabImpatientDbPersonaId,
  [paths.personaLabPatientDbPersonaId]: paths.personaLabPatientDbPersonaId,
}

function envOverrideFor(fixtureOrDbId: string): string | null {
  const impatientKeys = new Set([
    paths.personaLabImpatientPersonaId,
    paths.personaLabImpatientDbPersonaId,
  ])
  const patientKeys = new Set([
    paths.personaLabPatientPersonaId,
    paths.personaLabPatientDbPersonaId,
  ])
  if (impatientKeys.has(fixtureOrDbId)) {
    return process.env[paths.envLabAlexPersonaId]?.trim() || null
  }
  if (patientKeys.has(fixtureOrDbId)) {
    return process.env[paths.envLabSamPersonaId]?.trim() || null
  }
  return null
}

/**
 * Resolve a lab (or already-DB) persona id for wave materialization.
 * Unknown ids pass through unchanged (EBM Alex/Sam Nachrüster etc.).
 */
export function resolveLabPersonaId(personaId: string): string {
  const id = personaId.trim()
  if (!id) return id
  const env = envOverrideFor(id)
  if (env) return env
  return LAB_PERSONA_FIXTURE_TO_DB[id] ?? id
}

/** True when id is a known lab fixture alias or documented DB id. */
export function isLabPersonaId(personaId: string): boolean {
  return personaId in LAB_PERSONA_FIXTURE_TO_DB
}
