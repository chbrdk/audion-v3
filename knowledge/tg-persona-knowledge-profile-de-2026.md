# TG + persona knowledge / documents + profile_de — audion-v3

**Date:** 2026-07-30  
**Status:** Magazine P1 slice  
**Related:** `knowledge/project-knowledge-ux.md` · V2 TG/persona knowledge CRUD · bilingual profile mirror

## Product goal

1. **TG knowledge** — magazine Accordion + TipTap cards + sources list metadata.
2. **Persona knowledge/docs** — same pattern under Notes / Documents.
3. **profile_de** — German mirror of profile bands; EN remains canonical.

## Shipped

| Surface | Routes / UI |
|---------|-------------|
| TG knowledge | `GET/POST /api/target-groups/[id]/knowledge` · `PUT/DELETE …/knowledge/[entryId]` · dossier on TG detail |
| Persona knowledge | `GET/POST /api/personas/[id]/knowledge` · `PUT/DELETE …/knowledge/[entryId]` · dossier on persona detail |
| Documents | List metadata on detail (`documents[]`); upload deferred |
| profile_de | `PersonaDetail.profileDe` + `headlineDe`; locale-aware hero (`paths.localeStorageKey`); DE band |

Shared UI: `ResourceKnowledgeDossier` (clone of project knowledge Accordion pattern).

## Deferred

- File upload / ingest pipeline for documents
- Full field-by-field DE editing UI
- Locked-tile rebuild
- TG explorer graph
