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

### Live fix 2026-09-29 (Direct OpenAI mismatch)

`AI_OPENAI_MODEL` had been set to `qwen/qwen3-max` while chat still used Direct OpenAI (`sk-proj`, `OPENAI_API_BASE_URL` unset) → model 404s on chat.

Reverted mid to Direct OpenAI; kept low/high as Act allowlist (Act still off). Applied via REST `PATCH …/applications/{uuid}/envs/bulk` (non-preview), deleted stale preview duplicates (incl. terra), then light restart. Restart id: `zgs4hf3v60fscbw6agnajzt3`.

| Key | Before (broken) | After (live) |
|-----|-----------------|--------------|
| `AI_OPENAI_MODEL` | `qwen/qwen3-max` | **`gpt-6-luna`** (mid live / Direct OpenAI) |
| `AI_OPENAI_MODEL_CHAT_LOW` | `qwen/qwen3.7-flash` | `qwen/qwen3.7-flash` (allowlist ready; unused while Act=`0`) |
| `AI_OPENAI_MODEL_CHAT_HIGH` | `openai/gpt-5.6-terra` | **`gpt-6-astra`** (real OpenAI id — Astra, not terra) |
| `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER` | `0` | `0` (Act **OFF**) |
| `OPENAI_API_BASE_URL` | unset | **unset** (Direct OpenAI) |
| `OPENAI_API_KEY` | present (`sk-proj-…`) | unchanged |
| `JEV_SHADOW_ENABLED` | `1` | `1` (unchanged) |

**Qwen mid only after OpenRouter chat alignment** (BASE_URL + compatible key on the OpenAI chat client path). Until then mid stays `gpt-6-luna`.

### Earlier apply (superseded)

First Coolify write same day set mid=`qwen/qwen3-max`, high=`openai/gpt-5.6-terra` (restart `w3tokedxxlyfwpf5v2mdnhus`). That mid broke Direct OpenAI chat; corrected by the live fix above.

## BASE_URL decision

Chat + images still use the OpenAI SDK via `OPENAI_API_KEY` (direct `sk-proj`). OpenRouter is already wired for Jev shadow / RAG (`OPENROUTER_API_*`), not for `createOpenAiClient()`.

**Did not set** `OPENAI_API_BASE_URL=https://openrouter.ai/api/v1` because:

1. Existing `OPENAI_API_KEY` is direct OpenAI — OpenRouter would reject it.
2. Copying `OPENROUTER_API_KEY` onto `OPENAI_API_KEY` would wipe the direct key and risk breaking image gen (`AI_OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst` bare id).

## Flip checklist

1. ~~`JEV_SHADOW_ENABLED=1` + OpenRouter key on Coolify~~ **Done**
2. ~~Set `AI_OPENAI_MODEL` / `CHAT_LOW` / `CHAT_HIGH` allowlist~~ **Done** (mid live=`gpt-6-luna`; low/high ready)
3. Align chat client to OpenRouter (BASE_URL + compatible `OPENAI_API_KEY`) **before** moving mid to Qwen
4. Soak agree/latency on `[jev-shadow]` for `audion.persona_chat_model_tier`
5. Flip `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER=1` only after soak + OpenRouter chat path (low Qwen needs it)

## Residual risks

1. **Low allowlist is OpenRouter-prefixed** (`qwen/qwen3.7-flash`) — harmless while Act=`0`; will 404 on Direct OpenAI if Act flips early.
2. **Act stays OFF** (`0`) — do not flip without soak + OpenRouter chat path for Qwen tiers.
