# Persona chat model tier (Jev)

**Status:** Accepted — shadow-first  
**Product:** AUDION native persona chat (`/api/chat/stream`)  
**Jev use case:** `audion.persona_chat_model_tier`  
**Parent:** `specs/domain/jev-decisions.md`

## Problem

Greeting turns (“hey, wie geht’s?”) and deep research/elicitation turns share one completion model (`AI_OPENAI_MODEL`). Prompt envelopes already adapt; cost/quality routing does not.

## Decision

1. Heuristic baseline classifies the user message into `low` | `mid` | `high`.
2. Jev Choice `tier` shadows (and optionally Acts) that baseline.
3. Model IDs come only from env allowlist — never free-form from Jev.

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

When Act is off, stream always uses mid (`getAiOpenAiModel()`); shadow still logs the heuristic tier.

## Chat transport (OpenRouter)

Persona chat completions use **`createChatCompletionClient()`**:

1. If `OPENROUTER_API_KEY` is set → OpenRouter OpenAI-compatible base (`OPENROUTER_API_BASE_URL` or `https://openrouter.ai/api/v1`).
2. Else → Direct OpenAI (`OPENAI_API_KEY` + optional `OPENAI_API_BASE_URL`).

Images / assist / workflows keep **`createOpenAiClient()`** (Direct OpenAI). Do not point `OPENAI_API_BASE_URL` at OpenRouter globally.

Canonical Coolify mid/low/high (target):

| Tier | Model id |
|------|----------|
| low | `qwen/qwen3.7-flash` |
| mid | `qwen/qwen3-max` |
| high | `openai/gpt-6-astra` (OpenRouter) or `gpt-6-astra` (normalized with `openai/` prefix on OR) |

## Implementation

- `apps/web/lib/ai/client.ts` — `createChatCompletionClient`
- `apps/web/lib/chat/persona-chat-model-tier.ts`
- Wire: `apps/web/lib/chat/native-stream.ts`
- Flip flag: `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER`
