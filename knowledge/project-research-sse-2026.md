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

## Deferred

- EventSource client in the dialog (poll is enough for MVP)
- Persist summaries into project knowledge chapters automatically
