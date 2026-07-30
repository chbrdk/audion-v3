# AUDION v3 — Journeys + Chat gaps

**Date:** 2026-07-30 · Chat live + UX-run convert shipped  
**Status:** Journeys + Chat MVPs + convert from Studies  
**Specs index:** `knowledge/specs-index.md`  
**Agent surface:** `knowledge/ux-agent-surface.md`

## Done

### Journeys
- Contracts, fixtures, `/journeys*`, horizontal phase slider, edit dialog, rail
- AI generate (Wave 2 live/stub)
- **Convert from UX run** — wave run panel + `POST /api/journeys/from-ux-run` (fixture + live `/journeys/from-ux-run`)

### Chat
- Contracts `packages/contracts/src/chat.ts`
- Stream: fixtures **or** chat-api SSE→NDJSON (`auto`/`api`)
- `/chat` open editorial surface + study/persona prefill
- `/chat/history` app-card list (fixtures)
- Rail **Chat**

## Deferred

- Chat: ~~moodboard drawer, share public~~ **Done** (`knowledge/chat-modalities-2026.md`); ~~inspect HITL / convert~~ **Done**; Tavus/voice thin hooks; citations hydrate, live history list

## Shipped (2026-07-30)

- Journeys: **phase moments AI** + **validate report** — `knowledge/journey-phase-ai-validate-2026.md`
