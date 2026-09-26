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

## Env (Coolify `audion-v3:main-app`)

| Key | Status |
|-----|--------|
| `OPENROUTER_API_KEY` | **Not present** at wave time — shadow cannot run until set |
| `JEV_SHADOW_ENABLED` | **Not set** (requires key first) |
| `JEV_ACT_*` | Unset (intentionally) |

When `OPENROUTER_API_KEY` is added: set `JEV_SHADOW_ENABLED=1` only. Do **not** set Act flags.

## Residual

1. Add `OPENROUTER_API_KEY` to Coolify audion-v3, then enable `JEV_SHADOW_ENABLED=1` and redeploy if Coolify requires restart for new env.
2. Act soak / flip later per plexon `knowledge/jev-flip-runbook.md`.
3. Stub candidates still unwired: `audion.journey_gate_signal`, `audion.replan_needed`.
