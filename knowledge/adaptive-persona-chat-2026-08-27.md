# Adaptive persona chat system prompt (2026-08-27)

**Spec:** `specs/domain/chat-workspace.md` · API `specs/api/chat.md`  
**Code:** `apps/web/lib/chat/adaptive-persona-chat-prompt.ts` · `persona-prompts-store.ts` · `native-stream.ts`

## Why

Thin `persona.chat_system_default` (name/role/bio/values only) made chat too generic and verbose. Personality must come from the magazine `PersonaDetail` every turn — not Skills, not RAG-on-traits.

## Assembly

1. Embodiment + identity  
2. Adaptive profile (traits w/ scores, style, goals, pains, journey dos/donts, sections, capped knowledge)  
3. Optional **custom voice** overlay (Settings persona prompt)  
4. Short-turn chat rules (**anti-method / anti-coach / list budget**)  
5. Per-turn **research elicitation envelope** when user dumps GEO U/BV/BR briefs (`withResearchElicitationEnvelope` in `native-stream`)  
6. URL tooling append in `native-stream`

`max_completion_tokens`: `paths.chatCompletionMaxTokens` (default **280**), elicitation turns `paths.chatElicitationMaxTokens` (**420**), env `AI_CHAT_MAX_TOKENS` overrides both. Newer OpenAI models reject legacy `max_tokens`.

## Humanize playbook

`knowledge/persona-chat-humanize-2026-09-20.md` — **natural dialogue first**; GEO elicitation secondary; surface form without dropping magazine traits.

## Custom voice

Stored custom text is a **voice overlay**, not a full replace. Magazine edits to traits/style apply immediately without rewriting custom text.
