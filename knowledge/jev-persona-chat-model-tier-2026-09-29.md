# Audion persona chat model tier — Jev wave (2026-09-29)

Shadow-first routing for native persona chat completion model.

| Item | Value |
|------|-------|
| Use case | `audion.persona_chat_model_tier` |
| Spec | `specs/domain/persona-chat-model-tier.md` |
| Hook | `lib/chat/persona-chat-model-tier.ts` → `native-stream.ts` |
| Act flag | `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER` (**default off**) |
| Models | mid=`AI_OPENAI_MODEL`; low=`AI_OPENAI_MODEL_CHAT_LOW`; high=`AI_OPENAI_MODEL_CHAT_HIGH` |

## Behaviour

- **Shadow only:** heuristic tier logged via `[jev-shadow]`; completion still uses mid default.
- **Act:** await Choice; map to allowlisted model; `[jev-act]` log; fail-open → heuristic.

## Flip checklist

1. `JEV_SHADOW_ENABLED=1` + OpenRouter key on Coolify
2. Optionally set `AI_OPENAI_MODEL_CHAT_HIGH` (and LOW) to real allowlisted IDs
3. Soak agree/latency on `[jev-shadow]`
4. Flip `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER=1`
