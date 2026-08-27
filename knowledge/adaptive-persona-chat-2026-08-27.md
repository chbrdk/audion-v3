# Adaptive persona chat system prompt (2026-08-27)

**Spec:** `specs/domain/chat-workspace.md` · API `specs/api/chat.md`  
**Code:** `apps/web/lib/chat/adaptive-persona-chat-prompt.ts` · `persona-prompts-store.ts` · `native-stream.ts`

## Why

Thin `persona.chat_system_default` (name/role/bio/values only) made chat too generic and verbose. Personality must come from the magazine `PersonaDetail` every turn — not Skills, not RAG-on-traits.

## Assembly

1. Embodiment + identity  
2. Adaptive profile (traits w/ scores, style, goals, pains, journey dos/donts, sections, capped knowledge)  
3. Optional **custom voice** overlay (Settings persona prompt)  
4. Short-turn chat rules  
5. URL tooling append in `native-stream`

`max_tokens`: `paths.chatCompletionMaxTokens` (default **500**), env `AI_CHAT_MAX_TOKENS`.

## Custom voice

Stored custom text is a **voice overlay**, not a full replace. Magazine edits to traits/style apply immediately without rewriting custom text.
