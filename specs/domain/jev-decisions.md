# Jev decisions (shadow) — AUDION

**Status:** Shadow-ready — follow PLEXON `specs/domain/jev-decisions.md`  
**Transport:** OpenRouter Decisions API · model `typesafe/jev-1.13`  
**Implementation:** `apps/web/lib/jev/`

## Shadow contract

1. Heuristic / LLM baseline remains **source of truth** until `JEV_ACT_<USE_CASE>=1`.
2. When `JEV_SHADOW_ENABLED=1` and `OPENROUTER_API_KEY` is set, call Jev fire-and-forget (fail-open, ~800 ms timeout).
3. Log structured compare: `useCaseId`, `baseline`, `jev`, `agree`, `latencyMs`, `costUsd`, `model`.
4. Never change product SoT from shadow. Never block the request on shadow failure.
5. Act is **off by default**. Flip only after soak criteria (see PLEXON `knowledge/jev-flip-runbook.md`).

## Wired use cases

| ID | Baseline | Questions | Hook |
|----|----------|-----------|------|
| `audion.friction_severity` | Heuristic `high`/`medium`/`low` on journey friction points | Choice `severity` | `scoreValidateJourney` / native validate friction map |
| `audion.insight_triage` | Heuristic `act_now`/`watch`/`noise` from finding severity | Choice `triage` | UX-study native findings assembly |
| `audion.persona_chat_model_tier` | Greeting → `low`; research elicitation → `high`; else `mid` | Choice `tier` | `lib/chat/persona-chat-model-tier.ts` · `native-stream.ts` |

### Act-apply — `audion.persona_chat_model_tier`

When `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER=1`:

1. Await Decisions on the chat stream path (fail-open → heuristic tier).
2. Map Choice `low|mid|high` → OpenAI model id from **env allowlist only** (`AI_OPENAI_MODEL` mid default; `AI_OPENAI_MODEL_CHAT_LOW` / `AI_OPENAI_MODEL_CHAT_HIGH` optional).
3. Never invent model IDs. Missing high/low env → fall back to mid (`AI_OPENAI_MODEL`).
4. Log `[jev-act]` with `applied`, `tier`, `model`.
5. Guest budgets / embed caps stay deterministic code (not Jev).

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
| `JEV_ACT_<USE_CASE>` | Per-case act (default off) |
| `JEV_TIMEOUT_MS` | Default `800` |
| `AI_OPENAI_MODEL_CHAT_LOW` | Optional cheaper chat model for tier `low` |
| `AI_OPENAI_MODEL_CHAT_HIGH` | Optional larger chat model for tier `high` |

Env suffix = uppercase id with dots → underscores (`audion.persona_chat_model_tier` → `AUDION_PERSONA_CHAT_MODEL_TIER`).
