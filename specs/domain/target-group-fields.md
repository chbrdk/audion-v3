# Target Group Fields

**Status:** Accepted — 2026-07-29  
**Contracts:** `TargetGroupSummary` · `TargetGroupDetail` · `TargetGroupWritePayload`  
**Migration:** `knowledge/target-group-migration-map.md`

## Summary fields

| Field | Notes |
|-------|--------|
| `id` | required |
| `name` | required |
| `segment` | required on write (UI may default `"Segment"`) |
| `description` | nullable |
| `status` | `active` \| `archived` \| `draft` — legacy `published` → `active` |
| `personaCount` | derived from linked personas when detail present |
| `projectId` | nullable |
| `updatedAt` | nullable |

## Detail fields

- Inherits summary
- `linkedPersonas[]` — `{ id, name, role, status, avatarUrl }`

## Behavioral priors (Phase 5 — shipped)

Target groups bias linked personas and segment-only chats. Contract: `TargetGroupBehavioralPriors`. Compile: `specs/domain/behavioral-controller.md` · `lib/behavior/tg-priors.ts`.

| Field | Notes |
|-------|--------|
| `blendWeight` | 0..1 — how hard TG pulls **default** persona knobs (default **0.25**) |
| `dimensions` | Partial canonical behavioral knobs |
| `segmentCues` | Keywords; also auto-derived from `segment`+`description` |
| `sharedStressTriggers` / `sharedAvoidances` | Merged into qualitative envelope |

**Persistence:** `target_groups.behavioral_priors` jsonb (`ensureBehavioralPriorsSchema`). Write via `TargetGroupWritePayload.behavioralPriors`. When explicit dimensions absent, `resolveTargetGroupPriors` averages linked persona policies.

## Write payload (`TargetGroupWritePayload`)

| Field | Notes |
|-------|--------|
| `name` | **required** |
| `segment` | required (trim; empty → `"Segment"`) |
| `description` | optional nullable |
| `status` | optional; create defaults `draft` |
| `projectId` | optional nullable |
| `linkedPersonaIds` | optional string ids; resolved against persona store on fixture write |

## Validation / normalize

- `persona_count` / `project_id` / `updated_at` accepted on API read
- Linked personas also accept legacy `personas[]` with `persona_id` / `job_title`
- Unknown linked ids are dropped when resolving from fixture store
