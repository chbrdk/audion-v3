# UX Studies / Waves (audion-v3)

## Purpose

First-class Study → Wave → Evaluate → Compare product loop (Testbirds-like), fixture-first with optional API proxy to AUDION-v2 `/ux-studies`.

## How to start (today)

1. Open audion-v3 → nav **Studies** → `/studies`
2. **New study** (create card) or open seed **EBM Produktkombinationen**
3. Study detail → **New wave** (seed run plan) or open **`audion-2026-07-30-mcp`**
4. Wave topbar: **Start** (confirm) → sync polls while `running`; **Evaluate**; **Compare** (picker); **Export report**
5. **Report** band: TipTap narrative + structured Soft-Q / hypothesis / finding edits via PATCH
6. **F-Fragen**: Copy or **Open in Chat** (`paths.routes.chatWithContext` — prompt + personaId + study/wave)

Default data source: fixtures (`NEXT_PERSONA_DATA_SOURCE=fixtures|auto`). Live API: set `api` + `NEXT_PERSONA_BACKEND_INTERNAL_URL` to AUDION-v2 — Start/Sync proxy to v2 orchestrate.

## Live API smoke (optional)

1. Run AUDION-v2 API with UX studies routes
2. In audion-v3: `NEXT_PERSONA_DATA_SOURCE=api` + `NEXT_PERSONA_BACKEND_INTERNAL_URL` (see `paths.env*`)
3. Open a wave → **Start** → confirm Sync polls against v2 `/ux-studies/…/sync`
4. Fixture mode remains default for UI demos without v2

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
| Start + Sync poll (fixture + API proxy) | Full report versioning / artifact CDN |
| Compare picker (multi-wave) | v2 Admin-UI |
| Report TipTap + structured PATCH + export body | New charting framework |
| F-Fragen Copy + Chat deep-link (persona + study context) | |
| Soft-Q value / confidence / rationale PATCH | |
| DS StatLede / DivergingBar / WizardSteps | |
