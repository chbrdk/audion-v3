# API — Behavioral gold scoreboard

**Status:** Accepted — 2026-10-07  
**Domain:** `specs/domain/behavioral-gold-scoreboard.md`  
**Path:** `paths.routes.apiBehavioralScoreboard` → `/api/behavioral/scoreboard`

## GET

Query: `policyId` (optional).

- With `policyId`: `{ scoreboard, observations }`
- Without: `{ scoreboards: BehavioralPolicyScoreboard[] }` (sorted by n)

Auth: session optional for read in staging; prefer logged-in.

## POST

Body: `BehavioralGoldObservation` fields (at least `policyId`, `personaId`, `surface`, `metrics`, `label`). Server fills `id` / `recordedAt` / `schemaVersion` when omitted.

Requires auth session.

Returns `{ observation }`.
