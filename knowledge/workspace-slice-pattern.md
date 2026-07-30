# Workspace slice pattern (clone for projects / settings)

Template: **target-groups** (simplest). Parallel: **journeys** (same shape + phases).

## Checklist (exact files)

| Layer | Target groups | Journeys |
|-------|---------------|----------|
| **1. Contracts** | `packages/contracts/src/target-groups.ts` → re-export in `packages/contracts/src/index.ts` | `packages/contracts/src/journeys.ts` |
| **2. Fixtures data** | `apps/web/lib/fixtures/target-groups.ts` | `apps/web/lib/fixtures/journeys.ts` |
| **2b. Fixture store** | `apps/web/lib/fixtures/target-group-store.ts` (`reset*`, `store*List/Detail`, create/patch) | `apps/web/lib/fixtures/journey-store.ts` |
| **3. Client lib** | `apps/web/lib/target-groups.ts` (normalize, filter, fetch → API then fixtures) | `apps/web/lib/journeys.ts` |
| **4. API routes** | `apps/web/app/api/target-groups/route.ts` · `.../[targetGroupId]/route.ts` | `apps/web/app/api/journeys/route.ts` · `.../[journeyId]/route.ts` |
| **5. Pages** | `apps/web/app/target-groups/page.tsx` · `.../[targetGroupId]/page.tsx` | `apps/web/app/journeys/page.tsx` · `.../[journeyId]/page.tsx` |
| **6. UI** | `apps/web/components/target-group-{list,detail}-panel.tsx` · `*-edit-dialog.tsx` | `journey-{list,detail}-panel.tsx` · `*-edit-dialog.tsx` (+ phase extras) |
| **7. paths.ts** | fixture/store path keys + `routes.targetGroups*` / `apiTargetGroups*` | `journeyFixturesPath` / `journeyStorePath` + `routes.journeys*` |
| **8. Rail nav** | `PRIMARY_NAV` entry in `apps/web/components/app-shell.tsx` | same file, `id: 'journeys'` |
| **9. Specs** | `specs/domain/target-group-workspace.md` · `target-group-fields.md` · `specs/api/target-groups.md` | `journey-workspace.md` · `journey-fields.md` · `specs/api/journeys.md` |
| **10. Tests** | store/normalize in `apps/web/__tests__/persona-contracts.test.ts`; UI in `persona-components.test.tsx`; rail in `app-shell.test.tsx` | same three files |

## Pattern notes

### 1. Contracts
One file per domain: `Summary`, `List`, `Detail`, `WritePayload` (+ status unions). Export from `index.ts`.

### 2. Fixtures store
- Static seed: `fixtures/<slice>.ts` (`DEMO_*`)
- Mutable store: `fixtures/<slice>-store.ts` — clone seed, list/detail/CRUD, `reset*Store()` for tests
- Register paths in `apps/web/lib/paths.ts` (`*FixturesPath`, `*StorePath`)

### 3. `page.tsx`
Async server page: read `searchParams` / `params` → `fetch*List/Detail` from `lib/<slice>.ts` → wrap in `AppShell` + `TopStatus` (demo vs live) → `*ListPanel` / `*DetailPanel`; catch → `Alert`.

### 4. `paths.ts`
Always add: UI routes, detail factory, API routes, fixture/store file paths. Never hardcode URLs in components.

### 5. Rail
`PRIMARY_NAV` in `app-shell.tsx`: `{ id, href: paths.routes.*, label, icon }`.

### 6. Specs
`specs/domain/<slice>-workspace.md` + `<slice>-fields.md` + `specs/api/<slice>.md`. Index in `knowledge/specs-index.md`.

### 7. Tests
| Concern | File |
|---------|------|
| Contracts / store / normalize / filter | `apps/web/__tests__/persona-contracts.test.ts` |
| List/detail panels | `apps/web/__tests__/persona-components.test.tsx` |
| Nav link present | `apps/web/__tests__/app-shell.test.tsx` |
| Spec files exist | `apps/web/__tests__/specs-inventory.test.ts` |

## Clone order for projects / settings

1. Specs → contracts → fixtures + store → `lib/<slice>.ts` → API routes → pages + panels → `paths.ts` + rail → tests.
