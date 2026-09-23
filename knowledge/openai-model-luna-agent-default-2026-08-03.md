# UX Journey Agent default = gpt-6-luna

**Date:** 2026-08-03  
**Model id:** `gpt-6-luna` ([OpenAI docs](https://developers.openai.com/api/docs/models/gpt-6-luna))  
**Evidence:** `knowledge/lab-ab-nano-mini-luna-2026-08-03.md`

## Why

Lab B A/B: Luna matched nano’s human abandon + gold 1.0 and mini’s zero missing-perception clears. Default the **agent** to Luna.

Web chat/assist stays on `paths.aiOpenAiModel` = `gpt-6-luna` unless separately changed.

## SoT

| Surface | Knob | Default |
|---------|------|---------|
| UX Journey Agent | `UX_JOURNEY_OPENAI_MODEL` / `paths.uxJourneyOpenAiModel` | `gpt-6-luna` |
| Agent Dockerfile `ENV` | same | `gpt-6-luna` |
| Coolify agent | runtime env (wins over image) | set to `gpt-6-luna` |
| Web chat | `AI_OPENAI_MODEL` | still `gpt-6-luna` |

## Ops

Coolify override wins over Dockerfile. Keep `UX_JOURNEY_OPENAI_MODEL=gpt-6-luna` on `audion-v3-ux-journey-agent`. Redeploy agent when changing the baked Dockerfile default.
