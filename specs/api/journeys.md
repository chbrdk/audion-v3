# Journey API Consumption

**Status:** Accepted — 2026-07-29 · Implemented fixture routes 2026-07-29  
**Contracts:** `@audion-v3/contracts` journeys  
**Config:** `apps/web/lib/runtime-config.ts` · `paths.ts`  
**Legacy:** AUDION-v2 `apps/api/app/routers/journeys.py`

## Source backend

AUDION v3 consumes the existing AUDION journey API and does not reimplement generation/validation services in MVP. Fixture mode uses an in-memory store + Next route handlers.

## Endpoints (upstream)

### MVP

- `GET /journeys?page=1&page_size=50[&project_id=…][&target_group_id=…]`
- `GET /journeys/{journeyId}`
- `POST /journeys` — body `JourneyWritePayload`
- `PUT` or `PATCH /journeys/{journeyId}` — body `Partial<JourneyWritePayload>` (prefer PATCH in v3 Next proxies)
- `DELETE /journeys/{journeyId}`

### Deferred (wire when product slice lands)

- `POST /journeys/generate`
- `POST /journeys/{id}/validate` · `GET …/validation-report`
- Phase/element/expectation CRUD under `/journeys/{id}/phases*`
- `GET …/measurements` · `…/insights` · `…/changes`
- Convert from UX run (`journeys_from_ux_runs`)

## Local Next (fixture writes)

| Method | Path | Store |
|--------|------|--------|
| `GET` | `/api/journeys` | list + filter |
| `POST` | `/api/journeys` (`paths.routes.apiJourneys`) | `storeCreateJourney` |
| `GET`/`PATCH`/`DELETE` | `/api/journeys/[journeyId]` | get / patch / `storeDeleteJourney` |

Seed: `apps/web/lib/fixtures/journeys.ts` · store: `journey-store.ts`

## Runtime rules

- Server-side calls prefer `NEXT_PERSONA_BACKEND_INTERNAL_URL` (shared backend) until `NEXT_JOURNEY_*` exists
- Client navigation stays on Next routes (`/journeys*`)
- No hardcoded base URLs outside config helpers
- Data source follows persona pattern: `fixtures` | `api` | `auto`
