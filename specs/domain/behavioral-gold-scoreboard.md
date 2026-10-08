# Behavioral gold scoreboard (policyId)

**Status:** Accepted — 2026-10-07 (Phase 6)  
**Parent:** `specs/domain/behavioral-controller.md`  
**Knowledge:** `knowledge/behavioral-controller.md` · `knowledge/human-behavior-fidelity-options-2026-10.md`  
**Lib:** `apps/web/lib/behavior/gold-scoreboard.ts` · `apps/web/lib/behavior/gold-store.ts`  
**API:** `GET/POST /api/behavioral/scoreboard`  
**UI:** `/studies/behavioral`

## Purpose

Enterprise claim “nahezu echt” requires **paired evidence**: synthetic runs under a compiled `policyId` compared to **human-gold bands** (and optional human-labeled observations). Soft-Q / lab correlators stay domain tools; this scoreboard is the **cross-surface fidelity ledger** keyed by policy.

## Observation

Each chat tick persist, video session warm, or browse correlate attach may emit:

| Field | Notes |
|-------|--------|
| `policyId` | From `BehavioralPolicy.policyId` |
| `surface` | `chat` \| `video` \| `browse` |
| `personaId` | Magazine id |
| `metrics` | frustration/fatigue/clarity/stance/turnIndex + policy knobs snapshot |
| `label` | `synthetic` (default) \| `human_gold` |
| `correlateScore` / `closerToHuman` | Optional browse lab correlate |

## Gold bands (defaults)

Chat/video (affect-forward):

| Metric | Band (inclusive) |
|--------|------------------|
| mean frustrationLoad | 0.12 – 0.55 |
| mean fatigue | 0.05 – 0.45 |
| abandon stance rate | ≤ 0.35 |
| mean timePressure (policy) | within ±0.15 of observation mean when labeled gold exists |

Browse: prefer attaching `closerToHuman` from `persona-lab-correlate` / findability correlator; scoreboard counts closer rate ≥ **0.65** when n≥3.

## Aggregate (`BehavioralPolicyScoreboard`)

- Group observations by `policyId`
- Means + stance histogram + surface counts
- Weighted checks vs gold bands → `score` 0..1, `closer` iff score ≥ threshold (default **0.65**) and **n ≥ 3** (policy: Soft-Q “belastbar”)
- Separately list `humanGoldCount` vs `syntheticCount`

## API

| Method | Path | Body / query |
|--------|------|----------------|
| `GET` | `/api/behavioral/scoreboard` | `?policyId=` optional; omit → list top policies |
| `POST` | `/api/behavioral/scoreboard` | observation upsert (auth) |

## UI

`/studies/behavioral` — magazine list of policy scoreboards (closer badge, n, means). No second project model.

## Acceptance

1. Recording from chat persist + video prepare is automatic (`synthetic`).
2. POST can mark `human_gold` for paired sessions.
3. Aggregate enforces n≥3 for `closer=true`.
4. Unit tests for band checks + store + API smoke.
5. Specs inventory includes this file.
