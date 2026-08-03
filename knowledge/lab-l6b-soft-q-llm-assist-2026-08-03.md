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

Default: **off** — Evaluate stays deterministic/fast.

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
