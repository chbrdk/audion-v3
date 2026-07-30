# Journey Fields

**Status:** Accepted — 2026-07-29 · Implemented MVP 2026-07-29  
**Contracts:** `JourneySummary` · `JourneyDetail` · `JourneyWritePayload` · phase types  
**Migration:** `knowledge/journey-migration-map.md`  
**Legacy model:** AUDION-v2 `apps/api/app/models/journey.py`

## Summary fields

| Field | Notes |
|-------|--------|
| `id` | required |
| `name` | required |
| `journeyType` | string (e.g. `awareness`, `purchase`, `ux_audit`) — UI Select |
| `status` | `draft` \| `active` \| `archived` |
| `phaseCount` | derived from phases when detail present |
| `targetGroupId` | nullable |
| `targetGroupName` | nullable display convenience on read |
| `projectId` | nullable |
| `updatedAt` | nullable |

## Detail fields

- Inherits summary
- `description` — nullable string
- `phases[]` — ordered `JourneyPhase`

### `JourneyPhase`

| Field | Notes |
|-------|--------|
| `id` | required |
| `name` | required |
| `order` | 0-based int |
| `summary` | nullable short text |
| `elements[]` | `JourneyPhaseElement` |

### `JourneyPhaseElement`

| Field | Notes |
|-------|--------|
| `id` | required |
| `kind` | `action` \| `thought` \| `feeling` \| `pain` \| `opportunity` \| `other` |
| `label` | display string |
| `order` | 0-based int |

## Write payload (`JourneyWritePayload`) — MVP

| Field | Notes |
|-------|--------|
| `name` | **required** |
| `journeyType` | required (trim; empty → `"journey"`) |
| `status` | optional; create defaults `draft` |
| `description` | optional nullable |
| `targetGroupId` | optional nullable |
| `projectId` | optional nullable |
| `phases` | optional full replace array for fixture writes (later: dedicated phase APIs) |

Does **not** include expectations, measurements, insights, or change log in MVP write.

## Validation / normalize

- Missing `phases` / `elements` → `[]`
- Sort phases/elements by `order`
- Unknown status → `draft`
- Accept snake_case aliases on API read (`journey_type`, `target_group_id`, `updated_at`, `phase_count`)

## Deferred write surfaces

- Per-phase CRUD endpoints (mirror v2 `/journeys/{id}/phases*`)
- Expectations / validation persona ids
- Generate payload (`POST /journeys/generate`)
