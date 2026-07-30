# Journey API Consumption

**Status:** Accepted — 2026-07-29 · Fixture CRUD + AI validate/history 2026-07-30  
**Contracts:** `@audion-v3/contracts` journeys · ai-workflows  
**Config:** `apps/web/lib/runtime-config.ts` · `paths.ts`  
**Legacy:** AUDION-v2 `apps/api/app/routers/journeys.py`  
**Knowledge:** `knowledge/journey-phase-ai-validate-2026.md`

## Source backend

Fixture mode uses an in-memory store + Next route handlers. Native AI (`NEXT_AI_RUNTIME`) runs validate/moments in-process; live persona-api proxy remains available for generate when configured.

## Endpoints (upstream intent)

### Shipped (v3 BFF or upstream)

- `GET /journeys?page=1&page_size=50[&project_id=…][&target_group_id=…]`
- `GET /journeys/{journeyId}`
- `POST /journeys` — body `JourneyWritePayload`
- `PATCH /journeys/{journeyId}` — body `Partial<JourneyWritePayload>`
- `DELETE /journeys/{journeyId}`
- `POST /journeys/generate` · project generate journey (Wave 2 stub/native)
- `POST /journeys/{id}/ai/generate` — phase moments (`template_id: journey.moments`)
- `POST /journeys/{id}/validate` — body `{ persona_ids, mode?: automated|chat|both }`
- Convert from UX run — `POST /api/journeys/from-ux-run` (fixture + live)

### Deferred

- Phase/element/expectation CRUD under `/journeys/{id}/phases*` (v3 patches full `phases[]` on journey)
- `GET …/measurements` · `…/insights` · `…/changes`
- Durable Postgres validation history (v3 caches in fixture store)

## Local Next (fixture + AI)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/journeys` | list + filter |
| `POST` | `/api/journeys` | `storeCreateJourney` |
| `GET`/`PATCH`/`DELETE` | `/api/journeys/[journeyId]` | get / patch / delete |
| `POST` | `/api/ai/journeys/[journeyId]/phase/generate` | moments |
| `POST` | `/api/ai/journeys/[journeyId]/validate` | fit report; appends history |
| `GET` | `/api/ai/journeys/[journeyId]/validation-reports` | history list |
| `GET` | `/api/ai/journeys/[journeyId]/validation-reports/[reportId]` | report detail |

Paths: `paths.routes.apiAiValidateJourney` · `apiAiJourneyValidationReports` · `apiAiJourneyValidationReport`  
Store: `apps/web/lib/fixtures/journey-validation-store.ts`

## Runtime rules

- Server-side calls prefer `NEXT_PERSONA_BACKEND_INTERNAL_URL` (shared backend) until `NEXT_JOURNEY_*` exists
- Client navigation stays on Next routes (`/journeys*`)
- No hardcoded base URLs outside config helpers
- Data source follows persona pattern: `fixtures` | `api` | `auto`
