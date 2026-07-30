# AI workflows — Wave 1 stubs

**Date:** 2026-07-30  
**Status:** UI + stub routes shipped; live persona-api proxy deferred (Wave 2)  
**Registry:** `apps/web/lib/ai-workflows.ts` · contracts `packages/contracts/src/ai-workflows.ts`  
**V2 inventory:** `AUDION-v2/knowledge/ai-trigger-buttons-inventory.md`

## Pattern

1. Magazine UI calls `paths.routes.apiAi*` (Next stub).
2. Stub creates fixture entities / returns suggestions + `{ stubbed: true, target: { method, path, body } }`.
3. `target` documents the V2 / persona-api call Wave 2 will proxy.

## Wave-1 map

| Workflow id | Next stub | Upstream (later) |
|-------------|-----------|------------------|
| `generatePersonas` | `POST /api/ai/target-groups/[tgId]/personas/generate` | `POST /api/target-groups/{tgId}/personas/generate` |
| `generatePersonaAvatar` | `POST /api/ai/personas/[personaId]/avatar/generate` | `POST /api/persona-admin/{personaId}/generate-image` |
| `suggestPersonaField` | `POST /api/ai/personas/[personaId]/suggest-field` | field AI routes / `/api/ai-assist` (see below) |
| `suggestTargetGroups` | `POST /api/ai/projects/[projectId]/suggest-target-groups` | `POST /api/projects/{projectId}/suggest-target-groups` |
| `suggestPersonas` | `POST /api/ai/projects/[projectId]/suggest-personas` | `POST /api/target-groups/{tgId}/suggest-personas` |
| `researchStart` | `POST /api/ai/projects/[projectId]/research/start` | `POST /api/projects/{projectId}/research/start` |
| `generateJourneyFromProject` | `POST /api/ai/projects/[projectId]/generate-journey` | `POST /api/projects/{projectId}/generate-journey` |
| `generateJourney` | `POST /api/ai/journeys/generate` | `POST /api/journeys/generate` |

## UI placement

- Personas list — Generate with AI (pick TG)
- TG detail topbar — Generate with AI
- TG list — Suggest with AI (pick project)
- Project audience band — Suggest TGs / Suggest personas / Start research / Generate journey
- Journeys create — Generate with AI card
- Persona magazine hero — Generate avatar (portrait overlay / hover)
- Persona magazine bands — Suggest on Interests / Values / Goals / Frustrations / Traits / Communication (vocab + structure)

### `suggestPersonaField` upstream map

| field | Upstream |
|-------|----------|
| interests / values / goals | `POST /api/personas/{id}/ai/{field}` |
| frustrations | `POST /api/personas/{id}/ai/pain-points` |
| traits / vocabulary / sentenceStructure | `POST /api/ai-assist` + `template_id: persona.*` |

UI: `SuggestPersonaFieldButton` → dialog → Add / Add all → parent merges + PATCH. Stub does **not** auto-write.

## Out of scope (later)

Moodboard, enrich-all batch, UX Journey Agent, prompt test, Easy Setup bootstrap, translate; live chat-api / persona-api proxy; Notes / Channels / Visuals field AI.
