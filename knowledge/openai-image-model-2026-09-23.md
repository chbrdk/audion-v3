# Persona avatar image model — GPT Image 2.5 Sunburst

**Date:** 2026-09-23  
**Status:** Default updated  
**Code:** `paths.aiOpenAiImageModel` · `getAiOpenAiImageModel()` · `runNativeGeneratePersonaAvatar`

## Change

| Before | After |
|--------|--------|
| `gpt-image-1-mini` | **`gpt-image-2.5-sunburst`** |

OpenAI Images API + OpenRouter Images collection (`openai/gpt-image-2.5-sunburst`) — precision tier of GPT Image 2.5 (newest OpenAI image family as of 2026-09). Speed sibling: `gpt-image-2.5-flare`. Flagship earlier gen: `gpt-image-2`. Floating OpenAI alias (not on OpenRouter): `chatgpt-image-latest`.

## Wiring

- Native avatar: `client.images.generate({ model: getAiOpenAiImageModel(), … })`
- Override: Coolify `AI_OPENAI_IMAGE_MODEL`
- Staging `audion-v3:main-app` currently uses **direct OpenAI** (`OPENAI_API_KEY=sk-proj-…`); bare model id. If `OPENAI_API_BASE_URL` points at OpenRouter, set `openai/gpt-image-2.5-sunburst`.
