# Knowledge Pack publish — AUDION → Collection

**Status:** Accepted (spec only) — 2026-08-03  
**Plexon SoT:** `plexon-v3/specs/domain/collection-knowledge-pack.md`  
**API:** `plexon-v3/specs/api/collection-knowledge-pack.md`  
**Local dossier:** `specs/domain/project-workspace.md` · `project-fields.md` · `knowledge/project-knowledge-ux.md` · `knowledge/project-research-sse-2026.md`

## Purpose

AUDION keeps the **rich** project knowledge dossier (`knowledgeChapters` HTML / TipTap) and research runs **product-local**. This spec defines how AUDION **distills** that work into the Collection Knowledge Pack facet `research_brief` (and optionally proposes `competitive` / `profile` fields) so CHECKION GEO and other capabilities can consume a shared brief without importing TipTap or persona graphs.

## Non-goals

- Replacing Audion `knowledgeChapters` with the pack
- Publishing personas, journeys, UX studies, or chat transcripts into the pack
- Auto-publishing on every keystroke (explicit user/service action)
- Sending full HTML into Plexon

## Flow

```
Audion dossier / research run
        │
        ▼  distill (plain sections)
POST Plexon …/knowledge/facets/research_brief/publish
        │
        ▼
Collection pack.research_brief  (shared SoT)
        │
        ▼  pull-on-use
CHECKION GEO suggest · Assistant · future Brandion
```

## Distill rules

| Source | Distillate |
|--------|------------|
| Research run `latest` summary | `summary` + `topics` + `sourceRunId` |
| Selected `knowledgeChapters` | `sections[]` — strip HTML → plainText; keep title; optional bullets |
| Easy Setup / bootstrap | May seed `profile` merge (`tagline`, `industry`) via separate facet publish — not silent overwrite of human edits |

Caps: follow plexon API size budgets (`research_brief` ≤ 64 KiB). Prefer ≤ 8 sections.

## Publish trigger (product UX)

| Trigger | Behaviour |
|---------|-----------|
| Project magazine — “Publish to Collection” | Admin confirms sections to include → service/session publish |
| After research success | Optional prompt: “Publish brief to Collection?” |
| Deferred auto | Out of scope for Phase 3 |

Requires `platformProjectId` on the Audion project (Wave 1 federation). If missing → CTA to repair Collection binding, do not invent a second project.

## Consume (research seed)

When starting research with a bound Collection:

1. `GET` pack facets `profile`, `competitive`, `geo_context` from plexon-v3.
2. Seed crawl / prompt context from those fields.
3. Do **not** require pack presence — empty facets → current Audion-only behaviour.

## Mapping

| Pack field | Audion source |
|------------|---------------|
| `research_brief.summary` | Research latest summary / joined chapter previews |
| `research_brief.sections` | Chosen chapters (`id` stable from chapter id) |
| `research_brief.sourceProjectId` | Audion `projects.id` |
| `research_brief.sourceRunId` | Research run id |
| `competitive` (optional merge) | Only when research explicitly extracts rival hosts — user confirm |

## Ownership labels (UI)

- Local dossier band: **Capability-local** (Audion)
- Publish button dek: writes **Shared** Collection knowledge in Plexon

## Phasing

| Phase | Notes |
|-------|-------|
| Spec | this doc |
| After Plexon Pack CRUD | implement distill helper + publish CTA |
| Brandion later | may consume `research_brief`; Audion does not write `brand` |

## Paths

Document client helpers under `apps/web/lib/runtime-config.ts` / `paths.ts` when implementing (Plexon knowledge URL). Until then: see `plexon-v3/knowledge/paths.md`.
