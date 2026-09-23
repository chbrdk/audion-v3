# OpenAI default = gpt-6-luna (Audion)

**Date:** 2026-09-23  
**Model id:** `gpt-6-luna` ([OpenAI docs](https://developers.openai.com/api/docs/models/gpt-6-luna))

## Scope

Audion web chat/assist and UX Journey Agent both default to **GPT-6 Luna**.

| Surface | Env / SoT | Default |
|---------|-----------|---------|
| Web chat / assist | `AI_OPENAI_MODEL` / `paths.aiOpenAiModel` | `gpt-6-luna` |
| UX Journey Agent | `UX_JOURNEY_OPENAI_MODEL` / `paths.uxJourneyOpenAiModel` | `gpt-6-luna` |
| Agent Dockerfile `ENV` | same | `gpt-6-luna` |
| UEQ post-hoc scripts | `UEQ_INFER_MODEL` → agent env → default | `gpt-6-luna` |

Image generation stays on `AI_OPENAI_IMAGE_MODEL` / `paths.aiOpenAiImageModel` (unchanged).

## Coolify

Runtime env wins over image defaults:

- `audion-v3:main-app` → `AI_OPENAI_MODEL=gpt-6-luna`
- `audion-v3-ux-journey-agent` → `UX_JOURNEY_OPENAI_MODEL=gpt-6-luna`

Redeploy both after changing baked Dockerfile / code defaults.

## Sampling caveat (web chat)

`gpt-6-luna` rejects non-default `temperature` (`400 … Only the default (1) value is supported`).
Native chat / assist / Soft-Q omit `temperature` via `lib/ai/openai-sampling.ts` when the model does not allow custom sampling.
