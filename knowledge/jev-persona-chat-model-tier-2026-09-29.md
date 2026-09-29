# Audion persona chat model tier — Jev wave (2026-09-29)

Shadow-first routing for native persona chat completion model.

| Item | Value |
|------|-------|
| Use case | `audion.persona_chat_model_tier` |
| Spec | `specs/domain/persona-chat-model-tier.md` |
| Hook | `lib/chat/persona-chat-model-tier.ts` → `native-stream.ts` |
| Act flag | `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER` (**default off / `0`**) |
| Models | mid=`AI_OPENAI_MODEL`; low=`AI_OPENAI_MODEL_CHAT_LOW`; high=`AI_OPENAI_MODEL_CHAT_HIGH` |

## Behaviour

- **Shadow only:** heuristic tier logged via `[jev-shadow]`; completion still uses mid default (`AI_OPENAI_MODEL`).
- **Act:** await Choice; map to allowlisted model; `[jev-act]` log; fail-open → heuristic.

## Coolify (`audion-v3:main-app` · `putvwgqq1c9yb30tsqosujde`)

Applied 2026-09-29 via REST `PATCH …/applications/{uuid}/envs/bulk`, then light restart (no volume wipe). Deploy/restart id: `w3tokedxxlyfwpf5v2mdnhus`.

### Flags before → after

| Key | Before | After |
|-----|--------|-------|
| `AI_OPENAI_MODEL` | `gpt-6-luna` | `qwen/qwen3-max` (mid) |
| `AI_OPENAI_MODEL_CHAT_LOW` | unset | `qwen/qwen3.7-flash` |
| `AI_OPENAI_MODEL_CHAT_HIGH` | unset | `openai/gpt-5.6-terra` |
| `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER` | unset | `0` (Act **OFF**) |
| `JEV_SHADOW_ENABLED` | `1` | `1` (unchanged; OpenRouter key present) |
| `OPENAI_API_BASE_URL` | unset | **unchanged (unset)** |
| `OPENAI_API_KEY` | present (`sk-proj-…` direct OpenAI) | **unchanged** (not wiped) |
| `OPENROUTER_API_KEY` | present (`sk-or-v1…`) | unchanged (Jev / RAG / shadow) |

### BASE_URL decision

Chat + images still use the OpenAI SDK via `OPENAI_API_KEY` (direct `sk-proj`). OpenRouter is already wired for Jev shadow / RAG (`OPENROUTER_API_*`), not for `createOpenAiClient()`.

**Did not set** `OPENAI_API_BASE_URL=https://openrouter.ai/api/v1` because:

1. Existing `OPENAI_API_KEY` is direct OpenAI — OpenRouter would reject it.
2. Copying `OPENROUTER_API_KEY` onto `OPENAI_API_KEY` would wipe the direct key and risk breaking image gen (`AI_OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst` bare id).

Qwen / OpenRouter-prefixed slugs on mid/low/high therefore need a deliberate follow-up: OpenRouter-compatible key on the OpenAI chat client path **or** revert mid to a direct-OpenAI model until then.

### High-tier slug note

Requested premium label “Astra” is not a known suite slug. Placeholder: `openai/gpt-5.6-terra` (suite-known premium). Replace when the real Astra/OpenRouter id is confirmed.

## Flip checklist

1. ~~`JEV_SHADOW_ENABLED=1` + OpenRouter key on Coolify~~ **Done**
2. ~~Set `AI_OPENAI_MODEL` / `CHAT_LOW` / `CHAT_HIGH` allowlist~~ **Done** (Coolify)
3. Align chat client to OpenRouter (BASE_URL + compatible `OPENAI_API_KEY`) **or** keep mid on a direct-OpenAI id before Act
4. Soak agree/latency on `[jev-shadow]` for `audion.persona_chat_model_tier`
5. Flip `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER=1` only after soak

## Residual risks

1. **Mid live path:** With Act off, completions still use `AI_OPENAI_MODEL` (`qwen/qwen3-max`) against direct OpenAI — expect model errors until OpenRouter chat alignment or mid rollback to `gpt-6-luna`.
2. **Astra → terra placeholder:** high tier may not match the intended premium model.
3. **Act stays OFF** (`0`) — do not flip without soak + OpenRouter chat path.
