# Target Groups API Consumption

**Status:** Accepted — 2026-07-29  
**Contracts:** `@audion-v3/contracts` target-groups  
**Config:** same data-source pattern as personas until a dedicated TG env exists

## Endpoints (upstream)

- `GET /target-groups?page=1&page_size=50`
- `GET /target-groups/{id}`
- `POST /target-groups` — body `TargetGroupWritePayload`
- `PATCH /target-groups/{id}` — body `Partial<TargetGroupWritePayload>`

## Local Next (fixture writes)

| Method | Path | Store |
|--------|------|--------|
| `POST` | `/api/target-groups` | `storeCreateTargetGroup` |
| `PATCH` | `/api/target-groups/[targetGroupId]` | `storePatchTargetGroup` |
| `DELETE` | `/api/target-groups/[targetGroupId]` | `storeDeleteTargetGroup` — hard delete (linked personas remain) |

Seed: `apps/web/lib/fixtures/target-groups.ts` · store: `target-group-store.ts`  
Linked persona ids resolve against the persona fixture store.

## Hub list UX

- Target groups index (`/target-groups`) list/cards: delete icon with confirm → `DELETE` above.
- Project audience band: remove is hard delete (same API).

## EARS

- WHEN the user confirms delete on the target-groups hub or project audience list THEN the target group MUST be removed and MUST NOT appear in subsequent lists
- WHEN a target group is deleted THEN linked personas MUST remain (only the TG row is removed)

## Runtime

- Prefer `NEXT_PERSONA_BACKEND_INTERNAL_URL` for TG fetches in auto/api modes
- Paths documented in `knowledge/paths.md` / `paths.routes.*`
