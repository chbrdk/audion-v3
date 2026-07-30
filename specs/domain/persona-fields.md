# Persona Fields

**Status:** Accepted — 2026-07-29  
**Contracts:** `PersonaSummary` · `PersonaDetail` · `PersonaWritePayload`

## Required summary fields

- `id`
- `name`
- `role`
- `status` (`draft` \| `ready` \| `archived`)
- `avatarUrl` (nullable)
- `projectId` (nullable)
- `archetype` (nullable)
- `updatedAt` (nullable)

## Detail fields

- `bio`, `age`, `location`, `gender`, `attentionSpan` (nullable strings)
- `colorPalette[]`, `mediaAffinity`, `confidence`
- `traits` — `Record<string, number>` (0..1)
- `interests[]`, `values[]`, `socialMediaUsage[]`
- `communicationStyle` — `{ vocabulary[], sentenceStructure, skepticismLevel }` or null
- `goals[]` — `{ label, priority }`
- `frustrations[]` — `{ label, evidenceCount }` (v2 `pain_points`)
- `channels[]` — work touchpoints (distinct from social media)
- `sections[]` — `{ title, body }`
- `visuals` — `{ styleKeywords[], tiles[{ id, imageUrl, category, caption }] }` or null
- inherits summary fields

## Write payload (`PersonaWritePayload`)

Used by create / PATCH dialogs and `/api/personas*`:

| Field | Notes |
|-------|--------|
| `name` | **required** |
| `role` | defaults to `"Persona"` if blank |
| `status` | optional; create defaults `draft` |
| profile scalars / arrays above | optional; patch-ready |
| `goals`, `frustrations`, `channels` | optional; goals/frustrations are objects |
| `sections` | optional Notes cards `{ id?, title, body }` — Accordion + TipTap like project knowledge |
| `visuals` | optional moodboard `{ styleKeywords[], tiles[] }` or `null` to clear |
| `avatarUrl` | optional hero portrait URL; empty/`null` clears to initials |
| `projectId` | optional nullable |

File upload deferred — write accepts URL only (fixture path or remote). AI generate stub: `POST /api/ai/personas/[id]/avatar/generate` → later `POST /api/persona-admin/{id}/generate-image`.

## Validation / normalize

- Missing arrays → `[]`; missing traits → `{}`
- Missing optional strings / numbers → `null`
- Unknown status → `draft`
- Avatar accepts `avatarUrl` / `avatar_url` / `imageUrl` / `image_url` on read
- Nested v2 `{ profile, moodboard }` unwrapped in `normalizePersonaDetail`
- Legacy `goals`/`frustrations`/`pain_points` as `string[]` coerced to objects
