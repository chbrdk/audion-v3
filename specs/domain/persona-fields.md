# Persona Fields

**Status:** Accepted — 2026-07-29 · Journey/think-aloud extensions 2026-08-01  
**Contracts:** `PersonaSummary` · `PersonaDetail` · `PersonaWritePayload`  
**Agent mapping:** `knowledge/ux-agent-surface.md` · `apps/web/lib/chat/persona-agent-context.ts`

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
- `colorPalette[]`, `mediaAffinity`, `confidence` (0..1 nullable)
- `techLiteracy` (0..1 nullable) — digital / navigation skill
- `emotionalBaseline` (nullable string) — default affect e.g. `cautious`, `optimistic`
- `stressTriggers[]` — situations that raise friction
- `motivations[]` — `{ label, type?: 'intrinsic' \| 'extrinsic' \| null }`
- `traits` — `Record<string, number>` (0..1)
- `interests[]`, `values[]`, `socialMediaUsage[]`
- `communicationStyle` — `{ vocabulary[], sentenceStructure, skepticismLevel }` or null
- `goals[]` — `{ label, priority }`
- `frustrations[]` — `{ label, evidenceCount }` (v2 `pain_points`)
- `channels[]` — work touchpoints (distinct from social media)
- `sections[]` — `{ title, body }`
- `visuals` — `{ styleKeywords[], tiles[{ id, imageUrl, category, caption }] }` or null
- `journeyBehavior` — soft journey DSL (see below)
- `knowledgeEntries[]`, `documents[]`
- `tavusReplicaId` — Tavus Face / replica id (nullable; e.g. `r5e781e37a8d`). Required to start a video call.
- `tavusPersonaId` — Tavus PAL id (nullable). Auto-upserted from magazine when replica + API key are set (`specs/domain/tavus-video-chat.md`).
- inherits summary fields

## Journey behavior (`PersonaJourneyBehavior`)

| Field | Notes |
|-------|--------|
| `dimensionOverrides` | six soft knobs 0..1 (risk, time, explore, detail, trust, a11y) |
| `dos` / `donts` | string lists (capped when sent to agent) |
| `extraInstructions` | free text |
| `heuristics` | editable soft rules; merged with runtime-derived heuristics |

## Write payload (`PersonaWritePayload`)

Used by create / PATCH dialogs and `/api/personas*`:

| Field | Notes |
|-------|--------|
| `name` | **required** |
| `role` | defaults to `"Persona"` if blank |
| `status` | optional; create defaults `draft` |
| profile scalars / arrays above | optional; patch-ready |
| `motivations`, `techLiteracy`, `emotionalBaseline`, `stressTriggers` | optional |
| `goals`, `frustrations`, `channels` | optional; goals/frustrations are objects |
| `sections` | optional Notes cards `{ id?, title, body }` |
| `visuals` | optional moodboard or `null` to clear |
| `journeyBehavior` | optional incl. `heuristics` |
| `tavusReplicaId` | optional nullable Face / replica id |
| `tavusPersonaId` | optional nullable PAL / persona id |
| `avatarUrl` | optional; empty/`null` clears to initials |
| `projectId` | optional nullable |

## Agent mapping (what the UX journey receives)

| Product | Agent `PersonaContext` |
|---------|------------------------|
| id, name, role/archetype | id, name, headline |
| bio, location, values, interests, traits | `profile.*` |
| goals / frustrations | `profile.goals` / `painPoints` |
| communicationStyle | `profile.communicationStyle` |
| attentionSpan, confidence, techLiteracy | `profile.*` |
| motivations, emotionalBaseline, stressTriggers | `profile.*` |
| channels | `profile.channels` |
| knowledgeEntries (truncated) | `profile.priorKnowledge[]` |
| sections (all) | folded into `extraInstructions` (+ Mindset/Working-with priority) |
| journeyBehavior dims/dos/donts/extra/heuristics | dimensionOverrides, dos, donts, extra, heuristics |

**Not sent:** avatarUrl, visuals, colorPalette, mediaAffinity, profileDe, status, projectId, tavusReplicaId, tavusPersonaId.

## Validation / normalize

- Missing arrays → `[]`; missing traits → `{}`
- Missing optional strings / numbers → `null`
- `techLiteracy` / `confidence` clamped 0..1 when present
- Unknown status → `draft`
- Avatar accepts `avatarUrl` / `avatar_url` / `imageUrl` / `image_url` on read
- Nested v2 `{ profile, moodboard }` unwrapped in `normalizePersonaDetail`
- Legacy `goals`/`frustrations`/`pain_points` as `string[]` coerced to objects
- Tavus ids accept `tavusReplicaId` / `tavus_replica_id` / `face_id` and `tavusPersonaId` / `tavus_persona_id` / `pal_id` (do **not** coerce Audion `persona_id`)
