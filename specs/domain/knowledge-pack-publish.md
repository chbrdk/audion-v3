# Knowledge Pack publish — AUDION → Collection

**Status:** Accepted — implemented — 2026-08-03  
**Plexon SoT:** `plexon-v3/specs/domain/collection-knowledge-pack.md`  
**API:** `plexon-v3/specs/api/collection-knowledge-pack.md`  
**Sync:** `plexon-v3/knowledge/collection-knowledge-sync.md`  
**Local dossier:** `specs/domain/project-workspace.md` · `project-fields.md` · `knowledge/project-knowledge-ux.md` · `knowledge/project-research-sse-2026.md`

## Purpose

AUDION keeps the **rich** project knowledge dossier (`knowledgeChapters` HTML / TipTap) and research runs **product-local**. This spec defines how AUDION **distills** that work into the Collection Knowledge Pack facet `research_brief` (and optionally proposes `competitive` / `profile` fields) so CHECKION GEO and other capabilities can consume a shared brief without importing TipTap or persona graphs.

## Non-goals

- Replacing Audion `knowledgeChapters` with the pack
- Publishing personas, journeys, UX studies, or chat transcripts into the pack
- Auto-publishing on every keystroke (dossier edits use Re-sync CTA)
- Sending full HTML into Plexon

## Flow

```
Audion research succeeds
        │
        ▼  autosync distill (plain sections + chapters)
POST Plexon …/knowledge/facets/research_brief/publish
        │
        ▼
Collection pack.research_brief  (shared SoT)
        │
        ▼  pull-on-use
CHECKION GEO suggest · Personas · Assistant · future Brandion
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
| After research success | **Autosync** distill → `research_brief` (soft-skip if unbound / plexon down) |
| Project magazine — “Re-sync to Collection” | Manual re-publish after dossier edits or failed autosync |
| Kill-switch | `KNOWLEDGE_PACK_AUTOSYNC=0` |

Requires `platformProjectId` on the Audion project (Wave 1 federation). If missing → soft-skip + CTA to repair Collection binding.

## Consume (pull-on-use)

When a project is bound to a Collection (`platformProjectId`):

| Action | Pack use |
|--------|----------|
| Research start | Seed crawl / prompt from `profile`, `competitive`, `geo_context`, `research_brief` |
| Generate / suggest personas | Seed assist context from the same facets |
| Suggest target groups | Seed assist context from the same facets |

Do **not** require pack presence — empty facets / auth unset → Audion-only behaviour. Personas stay product-local; only the shared brief is pulled.

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
| Implemented | autosync after research + Re-sync CTA + pack seed on research / personas / target groups |
| Brandion later | may consume `research_brief`; Audion does not write `brand` |

## Paths

Document client helpers under `apps/web/lib/runtime-config.ts` / `paths.ts` when implementing (Plexon knowledge URL). Until then: see `plexon-v3/knowledge/paths.md`.
