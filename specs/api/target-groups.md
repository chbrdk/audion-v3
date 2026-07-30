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

Seed: `apps/web/lib/fixtures/target-groups.ts` · store: `target-group-store.ts`  
Linked persona ids resolve against the persona fixture store.

## Runtime

- Prefer `NEXT_PERSONA_BACKEND_INTERNAL_URL` for TG fetches in auto/api modes
- Paths documented in `knowledge/paths.md` / `paths.routes.*`
