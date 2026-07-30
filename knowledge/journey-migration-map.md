# Journey migration map (AUDION-v2 → v3)

| Legacy | v3 |
|--------|-----|
| `/admin/journeys` | `/journeys` |
| `/admin/journeys/new` | Create dialog on `/journeys` (no separate `/new` page) |
| `/admin/journeys/[journeyId]` | `/journeys/[journeyId]` magazine detail |
| `/admin/journeys/[id]/dashboard` | Deferred |
| `/admin/ux-journey-agent` | Deferred |
| Glass overview / canvas / phase-card / validation-panel | Magazine cards + horizontal phase slider + DS dialogs |
| `msqdx-glass-journey-timeline-viewport` + step pills | `JourneyPhaseSlider` (`.audion-journey-timeline*`) |
| Phase card Focus + Journey Moments | Slide card Focus + Moments (read-only MVP) |
| `Journey` model | `JourneySummary` / `JourneyDetail` |
| `JourneyPhase` + elements | nested on detail |
| `GET/POST/PUT/DELETE /journeys*` | Same upstream + fixture `/api/journeys*` |
| AI generate / validate / measurements | Deferred product slices |

Specs: `specs/domain/journey-workspace.md` · `journey-fields.md` · `specs/api/journeys.md`  
Contracts: `packages/contracts/src/journeys.ts`  
Fixtures: `apps/web/lib/fixtures/journeys.ts` · `journey-store.ts`  
Paths: `paths.routes.journeys` · `journeyDetail(id)` · `apiJourneys*`
