# Jev decisions (shadow) — AUDION

**Status:** Stub — follow PLEXON `specs/domain/jev-decisions.md`  
**Transport:** OpenRouter Decisions API · model `typesafe/jev-1.13`

## Fuzzy candidates

| ID | Baseline | Questions |
|----|----------|-----------|
| `audion.journey_gate_signal` | UX flow `gateSignals` | Noul pass/fail branch |
| `audion.replan_needed` | mid-run replan heuristic | Noul |
| `audion.friction_severity` | journey outline friction map | Choice high/medium/low |

## Env

`OPENROUTER_API_KEY`, `JEV_SHADOW_ENABLED`, per-case `JEV_SHADOW_*` / `JEV_ACT_*`.
