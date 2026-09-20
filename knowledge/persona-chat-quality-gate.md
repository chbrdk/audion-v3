# Persona chat quality gate (automatic)

**Status:** Active 2026-09-20  
**Why:** Customers chat with personas. New personas must not fall back to assistant-y GEO prose just because they were created later.

## Two automatic layers

| Layer | What | When |
|-------|------|------|
| **Runtime (every chat)** | Every persona builds the same adaptive stack (magazine traits + chat rules + locale few-shots + turn envelopes). Create seeds `DEFAULT_NATURAL_VOICE_OVERLAY`. | Always — no manual step per persona |
| **Deploy gate** | Focused vitest (`test:persona-chat`) runs in the Docker build. If humanize/eval/quality-gate tests fail, the image does not ship. | Every Coolify deploy |

Live LLM scoring (`scripts/eval-persona-chat.mjs`) stays an **ops** check (needs `AUDION_API_TOKEN`). It does not replace the deploy gate; it samples real model answers on staging.

## Commands

```bash
# Local / CI (no network)
npm run test:persona-chat

# Staging live sample (optional)
AUDION_API_TOKEN=audion_… \
  EVAL_PERSONA_ID=… EVAL_PROJECT_ID=… \
  node scripts/eval-persona-chat.mjs
```

## Paths

- Gate tests: `apps/web/__tests__/persona-chat-quality-gate.test.ts` · `persona-chat-eval.test.ts` · `adaptive-persona-chat-prompt.test.ts` · `humanize-reply.test.ts` · `persona-natural-voice-seed.test.ts`
- Dockerfile runs: `npm run test:persona-chat` before `npm run build` (`.dockerignore` must not exclude `__tests__` / vitest config)
- Spec: `specs/domain/persona-chat-eval.md`
