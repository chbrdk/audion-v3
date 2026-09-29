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

## Coolify OpenRouter chat alignment (2026-09-29) — applied

Code: `createChatCompletionClient()` — persona chat uses `OPENROUTER_API_KEY` when set; images stay on Direct OpenAI.

**BASE_URL split (critical):** Coolify keeps `OPENROUTER_API_BASE_URL=https://openrouter.ai` for Jev (`{base}/api/alpha/decisions`). Chat/RAG OpenAI-SDK clients must call `{origin}/api/v1` — `getOpenRouterApiBaseUrl()` appends `/api/v1` when missing. Without that, streams complete with empty content → UI shows only `…`.

Sequence (order mattered): force deploy with `4a6f27a` **before** flipping mid to Qwen.

| Step | Id / result |
|------|-------------|
| Force deploy | **`hptxyyojetjczfx7nggjkz8u`** — finished; commit `4a6f27a01f660014c43b0b36fdbbe736543e47d0`; image `registry.plygrnd.tech/msqdx/audion:4a6f27a…` |
| Env bulk `PATCH …/envs/bulk` | non-preview only; keys/base URLs untouched |
| Light restart (env apply) | **`a7s650kisnfys2bu5r4naeaq`** — finished (Coolify rebuilt because `AI_OPENAI_MODEL` is buildtime); still on `4a6f27a` |
| Health | `GET https://audion-v3.projects-a.plygrnd.tech/api/health` → **200** |
| OR smoke | tiny `qwen/qwen3-max` chat completion via OpenRouter → **200 / OK** |

Final env (non-preview):

| Key | Value |
|-----|-------|
| `AI_OPENAI_MODEL` | **`qwen/qwen3-max`** (mid live via OR chat client) |
| `AI_OPENAI_MODEL_CHAT_LOW` | `qwen/qwen3.7-flash` |
| `AI_OPENAI_MODEL_CHAT_HIGH` | **`openai/gpt-6-astra`** |
| `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER` | **`0`** (Act OFF; shadow only) |
| `OPENAI_API_KEY` | unchanged (`sk-proj-…`, Direct OpenAI for images) |
| `OPENAI_API_BASE_URL` | **unset** (unchanged) |
| `OPENROUTER_API_KEY` | unchanged (`sk-or-v1-…`) |

## Flip checklist (remaining)

1. ~~Deploy chat OpenRouter client~~ (`hptxyyojetjczfx7nggjkz8u` / `4a6f27a`)
2. ~~Set mid/low/high allowlist~~ (bulk + restart `a7s650kisnfys2bu5r4naeaq`)
3. Smoke persona chat in-app (mid = Qwen Max) — OR API smoke done; UI path still optional
4. Soak `[jev-shadow]` for `audion.persona_chat_model_tier`
5. Flip `JEV_ACT_AUDION_PERSONA_CHAT_MODEL_TIER=1`
