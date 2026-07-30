# UX Journey Agent surface (audion-v3)

**Date:** 2026-07-30  
**Decision:** There is **no** dedicated `/ux-journey-agent` page in v3. The official agent entry is **Studies → Wave → Start / Sync**.

## Contract

| Action | Where | Behavior |
|--------|--------|----------|
| Start agent jobs | Wave topbar **Start** | Fixtures: simulate run statuses. `api`: proxy `POST /ux-studies/{study}/waves/{wave}/start` (orchestrates UX Journey Agent). |
| Poll progress | Auto Sync while `status=running` + StatusMeterPanel | Fixtures: `storeSyncUxWave`. `api`: `POST …/sync`. |
| Convert run → Journey | Run panel **Convert to journey** | Fixture: deterministic phases. Live: `POST /journeys/from-ux-run` (`paths.routes.apiJourneyFromUxRun`). |

V2’s `/admin/ux-journey-agent` remains the low-level ops console; magazine product path is Studies.

## Paths

- Knowledge: this file · `knowledge/ux-studies.md`
- UI: `apps/web/components/wave-detail-panel.tsx`
- Convert: `apps/web/lib/journey-from-ux-run.ts` · `app/api/journeys/from-ux-run/route.ts`
- Routes: `paths.routes.apiStudyWaveStart` / `apiStudyWaveSync` / `apiJourneyFromUxRun`

## Out of scope

Dedicated Agent dashboard, live video/frame viewer, step screenshot gallery (stay on V2 until needed).
