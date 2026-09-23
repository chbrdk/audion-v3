# Persona & Target Group URL slugs

**Status:** Accepted — 2026-09-23  
**Routes:** `/personas/[slug]`, `/target-groups/[slug]`  
**Contracts:** `packages/contracts` `slug` on PersonaSummary / TargetGroupSummary  
**Code:** `apps/web/lib/entity-slug.ts` · stores · detail pages redirect

## Rule

- **`id`** is immutable (FKs, chat, API PATCH, linkedPersonaIds).
- **`slug`** is the magazine URL key; regenerated when **name** changes.
- Uniqueness: **global** across personas / target groups of the same kind (URL has no project prefix). Collision → `-2`, `-3`, …
- Canonical path helpers: `paths.routes.personaDetail` / `targetGroupDetail` take the **slug** (fallback `id`).
- Detail pages resolve by `id` **or** `slug`. If the URL param ≠ current slug → **308 redirect** to the slug URL (bookmarks with old id or stale slug still work).

## Acceptance

1. Create persona/TG → URL uses slug from name.
2. Rename → slug updates; client navigates to new path; old slug/id redirects.
3. API PATCH remains on `/api/…/[id]` (stable id); path param may also be a slug (resolved server-side).
4. Linked-persona cards link via slug when present.
