# Lab L6b — optional LLM Soft-Q assist

**Date:** 2026-08-03  
**Code:** `apps/web/lib/soft-q-llm-assist.ts`  
**Wired:** `memoryEvaluateUxWave` / `dbEvaluateUxWave` (after rule draft, before hand-merge)  
**Tests:** `apps/web/__tests__/soft-q-llm-assist.test.ts`  
**Paths:** `paths.softQLlmAssistPath` / `paths.envSoftQLlmAssist` (`AUDION_SOFT_Q_LLM_ASSIST`)

## Intent

Refine Soft-Q **rationales** (and nudge values ±1) from Think-Alouds via OpenAI when opted in. Rule draft remains the floor; failures keep the rule draft.

## Opt-in

```bash
export AUDION_SOFT_Q_LLM_ASSIST=1
export OPENAI_API_KEY=…
# model: AI_OPENAI_MODEL or paths.aiOpenAiModel (gpt-5.4-nano)
```

Default in code: **off** — Evaluate stays deterministic/fast.

### One-command Coolify enable (web)

```bash
# Token from ~/.cursor/mcp.json coolify Authorization — never commit
TOKEN=$(python3 -c "import json;from pathlib import Path;d=json.loads(Path.home().joinpath('.cursor/mcp.json').read_text());print(d['mcpServers']['coolify']['headers']['Authorization'].split()[-1])")
WEB_UUID=putvwgqq1c9yb30tsqosujde
# Merge env via Coolify UI or PATCH /api/v1/applications/{uuid}/envs — set:
#   AUDION_SOFT_Q_LLM_ASSIST=1
# Then redeploy:
curl -sS -X POST -H "Authorization: Bearer $TOKEN" \
  "https://coolify.plygrnd.tech/api/v1/deploy?uuid=$WEB_UUID"
```

## Staging policy (2026-08-04)

**Prefer ON** when unit tests green and ±1 clamp holds (Soft-Q still ~2 for Lab B confusion). Rule draft remains the floor; assist only polishes rationales.  
If Soft-Q drifts outside human band after enable → set `AUDION_SOFT_Q_LLM_ASSIST=0` and redeploy web.

**Prior (2026-08-03):** left OFF until try-then-quit stable — now stable; enable after deploy smoke.

## Safety

| Guard | Behavior |
|-------|----------|
| Env off / no key | Skip, note in result path |
| Bad / empty JSON | Keep rule draft |
| API error | Keep rule draft |
| Numeric LLM value | Clamped to rule ±1 (Q7 max 6) |
| Q4 null in rule | Stays null |
| Hand-filled Soft-Q | Still wins via `mergeSoftScoreDraft` |
| `LLM-assist:` rationale | Refreshable like Auto-draft |

## Verify

```bash
cd apps/web && ../../node_modules/.bin/vitest run __tests__/soft-q-llm-assist.test.ts __tests__/soft-q-draft.test.ts
```
