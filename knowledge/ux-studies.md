# UX Studies / Waves (audion-v3)

## Purpose

First-class Study → Wave → Evaluate → Compare product loop (Testbirds-like), fixture-first with optional API proxy to AUDION-v2 `/ux-studies`.

## How to start (today)

### EBM Referenz (sofort — ohne Live-Agent)

1. Open audion-v3 → nav **Studies** → `/studies`
2. Open seed **EBM Produktkombinationen** → `/studies/study-ebm-produktkombinationen`
3. Open complete wave **`audion-2026-07-30-mcp`** → `/studies/study-ebm-produktkombinationen/waves/wave-audion-2026-07-30-mcp`
4. Use **Evaluate** (aggregates / Soft-Q / H1–H5), **Compare**, **Report** / **Export**, **F-Fragen → Chat**
5. Staging: same paths under `https://audion-v3.projects-a.plygrnd.tech`

### Live / fixture Retest

1. Prefer draft wave **`phase2-nav-segment-plan`** or **New wave** / **New study from pack** (EBM ScenarioPack)
2. Wave topbar: **Start** (confirm) → sync polls while `running`; **Evaluate**; **Compare** vs `audion-2026-07-30-mcp`; **Export report**
3. Requires `UX_JOURNEY_AGENT_URL` (+ secret) for live browser runs; fixtures simulate progression without agent
4. Soft-Q / hypothesis narrative edits via PATCH on the evaluation slice

### Create flow

1. **New study** (blank) or **From pack: EBM Produktkombinationen**
2. Study detail → **New wave** (seed run plan) when not created from pack
3. F-Fragen: Copy or **Open in Chat** (`paths.routes.chatWithContext` — prompt + personaId + study/wave)

Default data source: fixtures (`NEXT_PERSONA_DATA_SOURCE=fixtures|auto`). Live API: set `api` + `NEXT_PERSONA_BACKEND_INTERNAL_URL` to AUDION-v2 — Start/Sync proxy to v2 orchestrate.

## Live API smoke (optional)

1. Run AUDION-v2 API with UX studies routes
2. In audion-v3: `NEXT_PERSONA_DATA_SOURCE=api` + `NEXT_PERSONA_BACKEND_INTERNAL_URL` (see `paths.env*`)
3. Open a wave → **Start** → confirm Sync polls against v2 `/ux-studies/…/sync`
4. Fixture mode remains default for UI demos without v2

Full manual checklist (fixtures loop + AI stubs + chat + shell): `knowledge/v2-v3-feature-parity.md` §6. Parity vs V2: same doc · backlog `knowledge/remaining-gaps.md`.

## Report editing

Wave **Report** band stores `reportMarkdown` (+ `reportUpdatedAt`). Export uses `buildWaveReportMarkdown` (narrative + aggregate + hyps + Soft-Q + runs). Soft-Q rationale, hypothesis verdict/rationale, and run findings PATCH the evaluation/runs slice.

## Paths

| Concern | Location |
|---------|----------|
| Specs | `specs/domain/ux-study-workspace.md`, `specs/domain/ux-study-fields.md`, `specs/api/ux-studies.md` |
| Contracts | `packages/contracts/src/ux-studies.ts` |
| Routes | `paths.routes.studies*` / `apiStudyWaveStart` / `apiStudyWaveSync` / `chatWithContext` in `apps/web/lib/paths.ts` |
| Chat prefill | `apps/web/lib/chat/prefill.ts` — query: `prompt`, `personaId`, `studyId`, `waveId`, `studyName`, `waveKey` |
| Fixtures | `apps/web/lib/fixtures/ux-studies.ts` · `ux-study-store.ts` |
| Lib | `apps/web/lib/ux-studies.ts` · `ux-studies-proxy.ts` |
| UI | `/studies`, `/studies/[studyId]`, `/studies/[studyId]/waves/[waveId]` |
| API (Next) | `/api/studies*` · `…/start` · `…/sync` · PATCH wave |
| DS | `@msqdx/ui` `StatLede`, `DivergingBarList`, `WizardSteps`, `StatusDot`, `StatusMeterPanel` |
| Seed wave | `audion-2026-07-30-mcp` (EBM Produktkombinationen) |
| Target URL | `paths.boschEbikeProduktkombinationenUrl` / key `bosch.ebike.produktkombinationen` |

## UI

- Magazine workspace: create dialogs (`StudyEditDialog` / `WaveEditDialog` + `WizardSteps`)
- Wave: Start + ConfirmDialog, sync poll + StatusMeterPanel, Compare picker, Report TipTap
- Lede / Soft-Q numerals: DS `StatLede` / `StatLedeGroup`
- Scorecard: ECHON `briefing-radar` + DS `DivergingBarList` (`CategoryScoreChart`)
- Soft-Q + F-Fragen: journey phase card chrome; F-Fragen → Copy + Chat deep-link
- Soft-Q edits: value (scale Select or text), confidence %, rationale → PATCH evaluation.softScores
- Chat deep-link: `personaId` (validEvidence run) + study/wave query; composer prefilled with study header + prompt

## Data source

- `NEXT_PERSONA_DATA_SOURCE=fixtures|auto|api`
- When `api`: Next `/api/studies*` proxies to v2 `/ux-studies*` (`ux-studies-proxy.ts`)
- Fixtures: `storeStartUxWave` / `storeSyncUxWave` simulate progression

## Done vs open

| Done | Open |
|------|------|
| Create Study / Wave dialogs | Statistischer n=15 / Testbirds-Parity |
| **New study from ScenarioPack** (EBM pack) | Full report versioning / artifact CDN |
| Start + Sync poll (fixture + API proxy) — **official UX Journey Agent surface** | New charting framework |
| `maxSteps` per run → agent; scorecard + validEvidence (403) mapping | Soft-Q auto-draft from valid runs (assist) |
| Compare picker (multi-wave) | |
| Report TipTap + structured PATCH + export body | |
| F-Fragen Copy + Chat deep-link (persona + study context) | |
| Soft-Q value / confidence / rationale PATCH | |
| DS StatLede / DivergingBar / WizardSteps | |
| Convert wave run → Journey | |
| EBM personas Alex/Sam fixtures | |

Agent surface contract: `knowledge/ux-agent-surface.md`.
