# AI workflows — Wave 2 live proxy

**Date:** 2026-07-30  
**Status:** UI + stub routes + **live persona-api / chat-api proxy** (`auto` | `api`)  
**Registry:** `apps/web/lib/ai-workflows.ts` · live runners `apps/web/lib/ai-workflows-live.ts` · contracts `packages/contracts/src/ai-workflows.ts`  
**V2 inventory:** `AUDION-v2/knowledge/ai-trigger-buttons-inventory.md`  
**Parity audit:** `knowledge/v2-v3-feature-parity.md` §3 · backlog `knowledge/remaining-gaps.md`

## Pattern

1. Magazine UI calls `paths.routes.apiAi*` (Next BFF).
2. `withAiLiveOrStub` (`ai-workflows.ts`):
   - `fixtures` → stub only (`stubbed: true`)
   - `auto` → try live; on failure fall back to stub
   - `api` → live only; 502 on upstream failure
3. Live calls use correct V2 FastAPI paths (no erroneous `/api` prefix) via `NEXT_PERSONA_BACKEND_INTERNAL_URL`.
4. Avatar generate uses **chat-api** `POST /personas/{id}/generate-image` (`NEXT_CHAT_API_INTERNAL_URL`).
5. Forward `Authorization` from the browser request when present (V2 endpoints often require auth).

## Wave map

| Workflow id | Next route | Upstream |
|-------------|------------|----------|
| `generatePersonas` | `POST /api/ai/target-groups/[tgId]/personas/generate` | `POST /target-groups/{tgId}/personas/generate` |
| `generatePersonaAvatar` | `POST /api/ai/personas/[personaId]/avatar/generate` | chat-api `POST /personas/{id}/generate-image` |
| `suggestPersonaField` | `POST /api/ai/personas/[personaId]/suggest-field` | `/personas/{id}/ai/{field}` or `/ai-assist` |
| `enrichPersona` | `POST /api/ai/personas/[personaId]/enrich` | `POST /personas/{id}/enrich` |
| `generateMoodboard` | `POST /api/ai/personas/[personaId]/moodboard/generate` | `POST /api/persona-admin/{id}/moodboards` |
| `suggestTargetGroups` | `POST /api/ai/projects/[projectId]/suggest-target-groups` | `POST /projects/{id}/suggest-target-groups` |
| `suggestPersonas` | `POST /api/ai/projects/[projectId]/suggest-personas` | `POST /target-groups/{tgId}/suggest-personas` |
| `researchStart` | `POST /api/ai/projects/[projectId]/research/start` | `POST /projects/{id}/research/start` |
| _(research follow-up)_ | `GET …/research/status` · `latest` · `stream` | Same under `/projects/{id}/research/*` |
| `generateJourneyFromProject` | `POST /api/ai/projects/[projectId]/generate-journey` | `POST /projects/{id}/generate-journey` |
| `generateJourney` | `POST /api/ai/journeys/generate` | `POST /journeys/generate` |
| `generateJourneyPhaseMoments` | `POST /api/ai/journeys/[journeyId]/phase/generate` | `POST /journeys/{id}/ai/generate` (`journey.moments`) |
| `validateJourney` | `POST /api/ai/journeys/[journeyId]/validate` | `POST /journeys/{id}/validate` |

## Chat live

| Mode | Behavior |
|------|----------|
| `fixtures` | Fake NDJSON stream |
| `auto` | Try chat-api SSE → NDJSON adapter; fall back to fixtures |
| `api` | Live only; 502 if chat-api down |

Adapter: `apps/web/lib/chat/upstream-stream.ts` (SSE `delta` → V3 `{type:'delta', text}`).

History list (`/api/chat/conversations`) remains fixture-backed (V2 history has upsert/append, no list GET yet).

## UI placement

Unchanged from Wave 1 — dialogs show **Stub · target** or **Live · path** from `stubbed` flag.

Persona detail topbar: **Enrich with AI** (`EnrichPersonaButton`). Visuals band: **Generate moodboard**.  
Journey: phase slide **Generate moments**; topbar **Validate**.

2026 approach notes: `knowledge/persona-enrich-moodboard-2026.md` · `knowledge/journey-phase-ai-validate-2026.md`.

## Out of scope (later)

Prompt test, Easy Setup bootstrap, translate; Notes / Channels field AI; locked-tile rebuild; bilingual `profile_de`; research SSE polish in magazine UI.
