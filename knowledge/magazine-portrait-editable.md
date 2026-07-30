# Persona magazine portrait (editable + AI)

**Date:** 2026-07-30

Hero portrait on persona detail is editable and has a Wave-1 AI generate stub.

## Behavior

- Click portrait → Image URL overlay (Save / Cancel / Clear)
- **Generate** (hover toolbar or inside editor) → `POST paths.routes.apiAiGeneratePersonaAvatar(id)`
- Stub cycles fixture SVGs under `paths.personaAvatarBasePath` and PATCHes `avatarUrl`
- Upstream (later): `POST /api/persona-admin/{personaId}/generate-image` (AUDION-v2 chat-api)

## Files

| Role | Path |
|------|------|
| UI | `apps/web/components/persona-editable-portrait.tsx` |
| Stub | `runStubGeneratePersonaAvatar` in `apps/web/lib/ai-workflows.ts` |
| Route | `apps/web/app/api/ai/personas/[personaId]/avatar/generate/route.ts` |
| Write | `PersonaWritePayload.avatarUrl` · `storePatchPersona` |

## Persist

`PATCH /api/personas/:id` with `{ avatarUrl }` (`null` / empty → initials).
