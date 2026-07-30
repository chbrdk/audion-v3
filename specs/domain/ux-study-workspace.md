# UX Study Workspace

**Status:** Accepted — Phase 3 Product Loop  
**Contracts:** `@audion-v3/contracts` ux-studies  
**Upstream API:** AUDION-v2 `/ux-studies`  
**UI repo:** audion-v3 only · primitives `@msqdx/ui`

## Purpose

First-class **Study → Wave → Run plan → Start/Sync → Evaluate → Compare → Report** so Testbirds-like UX tests are reproducible in AUDION (persona browser journeys), without claiming n=17 statistical parity.

## Surfaces

| Route | Role |
|-------|------|
| `/studies` | Study list + **New study** |
| `/studies/[studyId]` | Study detail + wave list + **New wave** |
| `/studies/[studyId]/waves/[waveId]` | Wave detail: run matrix, Start/Sync, evaluation, compare picker, report edit, F-Fragen → chat |

## Domain

- **Study** — project-scoped; guide reference; hypothesis templates H1–H5; target URL key
- **Wave** — one execution of the run plan; status draft/running/complete/failed; evaluation JSON; editable `reportMarkdown`
- **Run item** — one UX Journey Agent job (persona + task + url); `validEvidence` gate for scoring

## Actions (Phase 3)

| Action | Where |
|--------|--------|
| Create / edit Study | Dialog on list/detail |
| Create Wave (+ seed runs) | Dialog on study detail |
| Start wave | Wave topbar → `POST …/start` |
| Sync runs | Poll while running → `POST …/sync` |
| Evaluate | Wave topbar |
| Compare picker | Select other wave → compare delta band |
| Report edit | TipTap narrative + structured Soft-Q / hyp / finding patches |
| Export report | Markdown from evaluation + report draft |
| F-Fragen → Chat | Deep-link + copy via `paths.routes.chatWithContext` (prompt, personaId from validEvidence run, study/wave ids + names) |

## UX rules

- Magazine / workspace tone consistent with journeys (not dense admin tables only)
- Soft-Q and hypotheses show **confidence**; mark scores as soft / validEvidence-only
- Compare: baseline wave vs current; self-compare Δ = 0 as smoke
- No hardcoded backend URLs — `paths.ts` + runtime-config
- DS first: `StatLede`, `DivergingBar`, `WizardSteps` in `@msqdx/ui`

## Data source

- Fixtures: create/start/sync/report simulated locally
- `DATA_SOURCE=api`: proxy start/sync/CRUD to v2 orchestration
