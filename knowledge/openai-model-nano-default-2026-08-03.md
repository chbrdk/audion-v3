# OpenAI chat default = gpt-5.4-nano (cost)

**Date:** 2026-08-03  
**Model id:** `gpt-5.4-nano` ([OpenAI docs](https://developers.openai.com/api/docs/models/gpt-5.4-nano))

## Why

Lab + native AI burned significant OpenAI quota on larger models (`gpt-5.4-mini` / `gpt-4o`). Default everywhere to **nano** (~$0.20 / 1M input).

## SoT

| Surface | Knob | Default |
|---------|------|---------|
| Web chat / assist | `paths.aiOpenAiModel` / `AI_OPENAI_MODEL` | `gpt-5.4-nano` |
| UX Journey Agent (primary or fallback) | `UX_JOURNEY_OPENAI_MODEL` | `gpt-5.4-nano` |
| Local lab serve | `scripts/local-lab-agent-serve.sh` | same |
| Agent Docker image | `ENV UX_JOURNEY_OPENAI_MODEL` | same |

Image gen stays on `paths.aiOpenAiImageModel` (`gpt-image-1-mini`) — not a chat model.

## Ops

If Coolify still sets `UX_JOURNEY_OPENAI_MODEL=gpt-5.4-mini` or `gpt-4o`, **override wins** — clear or set nano there after deploy.

If AgentOutput validation fails on nano, temporarily set `gpt-5.4-mini` or `gpt-4o`.
