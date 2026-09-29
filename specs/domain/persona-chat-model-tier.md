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

## Implementation

- `apps/web/lib/chat/persona-chat-model-tier.ts`
- Wire: `apps/web/lib/chat/native-stream.ts`
- Flip flag: `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER`
