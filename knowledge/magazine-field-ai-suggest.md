# Persona magazine field AI suggestions

**Date:** 2026-07-30

Wave-1 stubs for Interests, Values, Goals, Frustrations, Traits, Communication vocabulary & sentence structure.

## Pattern

1. `SuggestPersonaFieldButton` in `SectionChrome.action` (Communication: vocab + structure)
2. `POST paths.routes.apiAiSuggestPersonaField(personaId)` with `{ field }`
3. Dialog lists suggestions → **Add** / **Add all** → parent merge helpers + existing PATCH
4. Stub returns `AiSuggestionItem[]` + `target` (no auto-write)

## Files

| Role | Path |
|------|------|
| UI | `apps/web/components/suggest-persona-field-button.tsx` |
| Merge helpers | `apps/web/lib/persona-field-suggest.ts` |
| Stub | `runStubSuggestPersonaField` in `apps/web/lib/ai-workflows.ts` |
| Route | `apps/web/app/api/ai/personas/[personaId]/suggest-field/route.ts` |

## Deferred

Notes, Visuals, Channels, batch Enrich-all (`POST /personas/{id}/enrich`).
