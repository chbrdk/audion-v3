# Lab agent crash after navigate (2026-08-03)

**Symptom:** Persona Lab L0 completes with `success: false`, finding `Agent error`, steps 2–N show `action: "[]"`, screenshots still show the Produktkombinationen page.

**Root cause:** After initial `navigate`, browser-use records history items with `model_output=None` (LLM parse / timeout / step error). `action_history()` emits empty lists → our mapper showed `"[]"`. After ~5 consecutive failures (upstream default) the agent stops. Staging had **no Anthropic fallback** (`anthropicKey: false`), so validation hiccups on gpt-4o had nowhere to recover.

**Fixes (this change):**
1. `_history_to_steps` maps empty actions + `history.errors()` → `action: "error"` + message
2. Failed runs set `result.error` / `result.summary` (no more opaque “Agent error” only)
3. Default `UX_JOURNEY_MAX_FAILURES=10` (was env-only / upstream 5)
4. Wave scorecard prefers `result.error` / `result.summary` for finding

**Ops:** Redeploy **ux-journey-agent** (and web). Prefer setting `ANTHROPIC_API_KEY` on the agent for cross-provider `fallback_llm`.

**Lab L1 (local, 2026-08-03):** `_apply_persona_step_budget` — `time_pressure >= 0.75` clamps to `UX_JOURNEY_IMPATIENT_MAX_STEPS` (default 10) and drops `min_steps` to 3; result exposes `stepBudget`. Retest job `536c4b2c…`: request 40 → budget 10, finished in 6 steps, friction 8, goal false, correlate closer.

**Retest:** Force-restart `wave-persona-lab-b-l0-msdfdbll` after deploy; correlate again.
