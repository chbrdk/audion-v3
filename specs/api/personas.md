# Persona API Consumption

**Status:** Accepted — 2026-07-29  
**Contracts:** `@audion-v3/contracts` personas  
**Config:** `apps/web/lib/runtime-config.ts` · `paths.ts`

## Source backend

AUDION v3 consumes the existing AUDION backend and does not reimplement persona services yet. Fixture mode uses an in-memory store + Next route handlers.

## Endpoints (upstream)

- `GET /personas?page=1&page_size=50[&project_id=...]`
- `GET /personas/{personaId}`
- `POST /personas` — body `PersonaWritePayload`
- `PATCH /personas/{personaId}` — body `Partial<PersonaWritePayload>`

## Local Next (fixture writes)

| Method | Path | Store |
|--------|------|--------|
| `POST` | `/api/personas` (`paths.routes.apiPersonas`) | `storeCreatePersona` |
| `PATCH` | `/api/personas/[personaId]` | `storePatchPersona`; then Tavus PAL upsert when replica + `TAVUS_API_KEY` |

Seed: `apps/web/lib/fixtures/personas.ts` · store: `persona-store.ts`

## Runtime rules

- Server-side calls prefer `NEXT_PERSONA_BACKEND_INTERNAL_URL`
- Client navigation stays on Next routes
- No hardcoded base URLs outside config helpers
- `NEXT_PERSONA_DATA_SOURCE`:
  - `fixtures` — always store
  - `api` — require live backend
  - `auto` — try API briefly, fall back to store
