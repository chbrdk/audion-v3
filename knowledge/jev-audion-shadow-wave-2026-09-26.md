# Audion Jev shadow wave — 2026-09-26

**Scope:** Shadow-only (`audion.friction_severity`, `audion.insight_triage`). **No Act flip.**

## What shipped

| Piece | Location |
|-------|----------|
| Spec | `specs/domain/jev-decisions.md` (Stub → Shadow-ready) |
| Client | `apps/web/lib/jev/` (env, types, client, shadow, schedule, catalog, hooks) |
| Suite catalog | plexon-v3 `jev-use-case-catalog.md` + `JEV_USE_CASES.audionInsightTriage` |
| Friction hook | `ai-workflows.ts` `scoreValidateJourney` + native validate chat friction |
| Insight triage | `ux-studies-native.ts` finding assembly |
| Secondary | plexon `audion-journey-outline-client.ts` `frictionSeverity` mapper |
| Tests | `__tests__/jev-client.test.ts`, `jev-shadow-hooks.test.ts` |

## Env (Coolify `audion-v3:main-app` · `putvwgqq1c9yb30tsqosujde`)

| Key | Status |
|-----|--------|
| `OPENROUTER_API_KEY` | **Present** (copied from plexon donor; runtime only) |
| `OPENROUTER_API_BASE_URL` | Set (`https://openrouter.ai`) |
| `JEV_MODEL_ID` | Set (`typesafe/jev-1.13`) |
| `JEV_TIMEOUT_MS` | Set (`800`) |
| `JEV_SHADOW_ENABLED` | **Set (`1`)** — shadow on after force redeploy |
| `JEV_ACT_*` | Unset (intentionally) |

Shadow env enabled 2026-09-26 via Coolify API (`PATCH …/envs/bulk` from plexon `OPENROUTER_API_KEY`, then force deploy). Do **not** set Act flags.

## Residual

1. ~~Add `OPENROUTER_API_KEY` + `JEV_SHADOW_ENABLED=1`~~ **Done** (Coolify + force redeploy).
2. Act soak / flip later per plexon `knowledge/jev-flip-runbook.md`.
3. Stub candidates still unwired: `audion.journey_gate_signal`, `audion.replan_needed`.
4. Live `[jev-shadow]` log evidence needs traffic (friction validate / insight triage); zero lines OK until then.
