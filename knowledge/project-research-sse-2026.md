# Project research SSE polish — audion-v3

**Date:** 2026-07-30  
**Status:** Magazine Wave-2 async job slice  
**Related:** `knowledge/ai-workflows.md` · V2 `knowledge/project-ai-research.md`

## Product goal

Start a research crawl from the project AI tray, then follow progress until a summary lands.

## 2026 async pattern

| Concern | Practice | Mapping |
|---------|----------|---------|
| Reliable spine | Poll status until terminal | `GET …/research/status?run_id=` |
| Accelerator | SSE progress events | `GET …/research/stream?run_id=&after=` |
| Result | Latest summary | `GET …/research/latest` |
| Orchestration | Thin BFF, stub time-machine in fixtures | `research-runs.ts` |

## Shipped

| Route | Behavior |
|-------|----------|
| `POST /api/ai/projects/[id]/research/start` | Queue job (live or stub) |
| `GET …/research/status` | Status + events |
| `GET …/research/latest` | Summary when succeeded |
| `GET …/research/stream` | SSE passthrough / stub chunks |

UI: **Start research** dialog polls status (~900ms) and renders events + latest summary. Stream route is available for clients that prefer EventSource.

## Where results land

| Surface | Behavior |
|---------|----------|
| Research modal | Progress events + latest summary (run store) |
| Project knowledge dossier | **Not automatic** — click **Add to project knowledge** after success (`POST …/research/apply-knowledge`) → `ch-research-*` Accordion chapters |
| Plexon Collection `research_brief` | Soft autosync when Collection bound (`scheduleResearchBriefAutosync`) |

## Apply to knowledge (2026-08-03)

- Lib: `apps/web/lib/research-to-knowledge.ts`
- API: `paths.routes.apiAiResearchApplyKnowledge(projectId)`
- UI: Research dialog footer button when summary is ready
- Re-apply replaces previous `ch-research-*` chapters; keeps other dossier chapters

- Browser-like `User-Agent` via `paths.researchCrawlUserAgent` (bare `node` UA → CloudFront **403** on `bosch-ebike.com`).
- Detect blocked bodies (`Request blocked` / 403) and try host fallbacks from `paths` (e.g. Produktkombinationen + Bosch Presse Hub Line).
- **CHECKION fallback:** when seed still blocked and `CHECKION_API_TOKEN` + CHECKION base are set → `POST /api/fetch-page` (Puppeteer text). Spec: `specs/domain/checkion-fetch-page-research.md`.
- Lib: `apps/web/lib/ai/research-crawl.ts` · `apps/web/lib/checkion-fetch-page.ts` · tests: `__tests__/research-crawl.test.ts`
- Easy Setup UA aligned to the same browser-compatible pattern.

## Deferred

- EventSource client in the dialog (poll is enough for MVP)
- Persist summaries into project knowledge chapters automatically
