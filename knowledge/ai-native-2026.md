# Native AI — audion-v3 (losgelöst von V2)

**Date:** 2026-07-30  
**Status:** Implemented — OpenAI in Next BFF; domain stays fixtures  
**Code:** `apps/web/lib/ai/*` · `ai-workflows-native.ts` · `chat/native-stream.ts`

## Entscheidung

- AI läuft **native** in audion-v3 (OpenAI SDK).
- Kein Coolify-Proxy mehr auf V2 persona-api / chat-api für Live-AI.
- V2-Proxy-Code (`ai-workflows-live.ts`, `persona-api-proxy` fetch) ist **deprecated**.
- Domain CRUD bleibt `NEXT_PERSONA_DATA_SOURCE=fixtures` bis Product-Postgres.

## Env (orthogonal)

| Var | Rolle |
|-----|--------|
| `NEXT_PERSONA_DATA_SOURCE` | Domain stores only (`fixtures` / `auto` / `api`) |
| `NEXT_AI_RUNTIME` | `stub` \| `native` \| `auto` (default `auto`) |
| `OPENAI_API_KEY` | Required for native / auto-with-key |
| `OPENAI_API_BASE_URL` | Optional |
| `AI_OPENAI_MODEL` | Default `gpt-5.4-mini` |
| `AI_OPENAI_IMAGE_MODEL` | Default `gpt-image-1-mini` |

`auto` = native when `OPENAI_API_KEY` set, else stub.

## Coolify

```bash
NEXT_PERSONA_DATA_SOURCE=fixtures
NEXT_AI_RUNTIME=auto
OPENAI_API_KEY=<secret>
AI_OPENAI_MODEL=gpt-5.4-mini
# NEXT_PERSONA_BACKEND_* / NEXT_CHAT_API_* not required for AI
```

Central URLs: `knowledge/deploy-urls.md` · path keys: `apps/web/lib/paths.ts`

## Surfaces

| Surface | Native path |
|---------|-------------|
| Chat stream | `lib/chat/native-stream.ts` → NDJSON |
| Magazine AI workflows | `lib/ai-workflows-native.ts` via `withAiNativeOrStub` |
| Research | In-process job `lib/ai/research-native.ts` + fixture events |
| Studies Start/Sync | `lib/ux-studies-native.ts` LLM run summaries |

## Pattern

1. UI → `/api/ai/*` or `/api/chat/stream`
2. `withAiNativeOrStub` / chat runtime helpers
3. Native runner → OpenAI → fixture store write
4. `stubbed: false` on success

## Smoke

1. Set `OPENAI_API_KEY` + `NEXT_AI_RUNTIME=auto`
2. Chat: message shows live deltas (not stub copy)
3. Persona Enrich / Suggest: `stubbed: false`
4. Research start → status progresses → latest summary
5. Studies sync with key → findings from LLM

## Tests

- `__tests__/ai-native-or-stub.test.ts`
- `__tests__/ai-native-workflows.test.ts`
- `__tests__/chat-native-stream.test.ts`
- Existing stub contract tests remain on `NEXT_AI_RUNTIME=stub`
