# Persona chat model tier

**Status:** Accepted — **heuristic only** (Jev unwired from chat 2026-09-29)  
**Product:** AUDION native persona chat (`/api/chat/stream`)  
**Former Jev use case:** `audion.persona_chat_model_tier` (catalog retained; not called from chat)

## Problem

Greeting turns (“hey, wie geht’s?”) and deep research/elicitation turns share one completion model (`AI_OPENAI_MODEL`). Prompt envelopes already adapt; cost/quality routing should too — without an extra Decisions round-trip on every turn (and N× on ask-all).

## Decision

1. Heuristic classifies the user message into `low` | `mid` | `high`.
2. Model IDs come only from env allowlist.
3. **Jev is not invoked on the chat path.** Shadow/Act for this use case stay off until a future soak shows real disagree value vs heuristic. Friction/insight Jev hooks are unchanged.

## Heuristic

| Signal | Tier |
|--------|------|
| `isGreetingMessage` | `low` |
| `isResearchElicitationMessage` | `high` |
| else | `mid` |

## Model map

| Tier | Env | Fallback |
|------|-----|----------|
| `mid` | `AI_OPENAI_MODEL` | `paths.aiOpenAiModel` |
| `low` | `AI_OPENAI_MODEL_CHAT_LOW` | mid |
| `high` | `AI_OPENAI_MODEL_CHAT_HIGH` | mid |

## Chat transport (OpenRouter)

Persona chat completions use **`createChatCompletionClient()`**:

1. If `OPENROUTER_API_KEY` is set → OpenRouter OpenAI-compatible base (`getOpenRouterApiBaseUrl()` — origin + `/api/v1` when Coolify sets bare `https://openrouter.ai` for Jev).
2. Else → Direct OpenAI (`OPENAI_API_KEY` + optional `OPENAI_API_BASE_URL`).

Images / assist / workflows keep **`createOpenAiClient()`** (Direct OpenAI).

Canonical Coolify mid/low/high (target):

| Tier | Model id |
|------|----------|
| low | `qwen/qwen3.7-flash` |
| mid | `qwen/qwen3-max` |
| high | `openai/gpt-6-astra` (OpenRouter) or `gpt-6-astra` (normalized with `openai/` prefix on OR) |

## Implementation

- `apps/web/lib/ai/client.ts` — `createChatCompletionClient` · `getOpenRouterApiBaseUrl`
- `apps/web/lib/chat/persona-chat-model-tier.ts` — heuristic → allowlist (no Jev)
- Wire: `apps/web/lib/chat/native-stream.ts`
- Former flip flag `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER` — unused on chat path
