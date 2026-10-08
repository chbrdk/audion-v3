# API — Behavioral gold scoreboard

**Status:** Accepted — 2026-10-07  
**Domain:** `specs/domain/behavioral-gold-scoreboard.md`  
**Path:** `paths.routes.apiBehavioralScoreboard` → `/api/behavioral/scoreboard`

## GET

Query: `policyId` (optional).

- With `policyId`: `{ scoreboard, observations }`
- Without: `{ scoreboards: BehavioralPolicyScoreboard[], observations }` — `observations` is the newest ≤40 ledger rows for the Studies UI

Auth: session optional for read in staging; prefer logged-in.

## POST

Body: `BehavioralGoldObservation` fields (at least `policyId`, `personaId`, `surface`, `metrics`, `label`). Server fills `id` / `recordedAt` / `schemaVersion` when omitted.

Requires auth session.

Returns `{ observation }`.

## PATCH

Body: `{ id: string, label: 'synthetic' | 'human_gold' }`.

Requires auth session. Relabels an existing observation in place (promote paired human runs). Returns `{ observation }` or `404` when unknown.
