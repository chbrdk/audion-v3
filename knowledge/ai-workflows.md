# AI workflows — native OpenAI (v3)

**Date:** 2026-07-30  
**Status:** UI + stub routes + **native OpenAI** (`NEXT_AI_RUNTIME`)  
**Registry:** `apps/web/lib/ai-workflows.ts` · native runners `apps/web/lib/ai-workflows-native.ts` · assist `apps/web/lib/ai/`  
**Doc:** `knowledge/ai-native-2026.md`

## Pattern

1. Magazine UI calls `paths.routes.apiAi*` (Next BFF).
2. `withAiNativeOrStub`:
   - `NEXT_AI_RUNTIME=stub` → stub only
   - `auto` → native when `OPENAI_API_KEY` set; else stub; fallback on error
   - `native` → native only; 502 on failure
3. Domain data remains fixture stores (`NEXT_PERSONA_DATA_SOURCE` orthogonal).
4. Deprecated: V2 persona-api / chat-api proxy (`ai-workflows-live.ts`).

## Env

See `knowledge/ai-native-2026.md` and `knowledge/deploy-urls.md`.

## Chat

Native stream: `apps/web/lib/chat/native-stream.ts` (NDJSON). History list still fixture-backed.
