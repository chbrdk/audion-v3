# Jev decisions (shadow) — AUDION

**Status:** Shadow-ready — follow PLEXON `specs/domain/jev-decisions.md`  
**Transport:** OpenRouter Decisions API · model `typesafe/jev-1.13`  
**Implementation:** `apps/web/lib/jev/`

## Shadow contract

1. Heuristic / LLM baseline remains **source of truth**. Act is **off by default** (`JEV_ACT_*` unset).
2. When `JEV_SHADOW_ENABLED=1` and `OPENROUTER_API_KEY` is set, call Jev fire-and-forget (fail-open, ~800 ms timeout).
3. Log structured compare: `useCaseId`, `baseline`, `jev`, `agree`, `latencyMs`, `costUsd`, `model`.
4. Never change product SoT from shadow. Never block the request on shadow failure.
5. **No Act flip in this wave** — do not set `JEV_ACT_AUDION_*`.

## Wired use cases

| ID | Baseline | Questions | Hook |
|----|----------|-----------|------|
| `audion.friction_severity` | Heuristic `high`/`medium`/`low` on journey friction points | Choice `severity` | `scoreValidateJourney` / native validate friction map |
| `audion.insight_triage` | Heuristic `act_now`/`watch`/`noise` from finding severity | Choice `triage` | UX-study native findings assembly |

Suite catalog SSOT: plexon-v3 `specs/domain/jev-use-case-catalog.md` · `JEV_USE_CASES`.

## Stub / later candidates

| ID | Baseline | Questions |
|----|----------|-----------|
| `audion.journey_gate_signal` | UX flow `gateSignals` | Noul pass/fail branch |
| `audion.replan_needed` | mid-run replan heuristic | Noul |

## Env

| Key | Role |
|-----|------|
| `OPENROUTER_API_KEY` | Required for shadow |
| `OPENROUTER_API_BASE_URL` | Default `https://openrouter.ai` |
| `JEV_MODEL_ID` | Default `typesafe/jev-1.13` |
| `JEV_SHADOW_ENABLED` | Global shadow (`1`/`true`) |
| `JEV_SHADOW_<USE_CASE>` | Per-case override (`0` off, `1` on) |
| `JEV_ACT_<USE_CASE>` | Per-case act — **leave unset** |
| `JEV_TIMEOUT_MS` | Default `800` |

Env suffix = uppercase id with dots → underscores (`audion.friction_severity` → `AUDION_FRICTION_SEVERITY`).
