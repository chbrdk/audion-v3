# Persona locked-tile moodboard rebuild — 2026

**Date:** 2026-07-30  
**Status:** Shipped (fixtures + native generate)  
**Related:** `knowledge/persona-enrich-moodboard-2026.md` · V2 `moodboard_service.py` locked-by-category

## Behavior

- `PersonaVisualTile.locked?: boolean` — when true, tile survives **Generate moodboard**
- Rebuild merges via `apps/web/lib/moodboard-tiles.ts` → `mergeMoodboardTiles`:
  1. Keep locked existing (first wins per category, case-insensitive)
  2. Drop unlocked existing
  3. Append generated tiles for categories that are not locked
- Magazine UI: Lock / Unlock on each tile; Remove disabled while locked; quiet “Keeps locked tiles” hint

## Paths

- Generate: `paths.routes.apiAiGenerateMoodboard(personaId)`
- Persist lock: `paths.routes.apiPersonaDetail(personaId)` PATCH `visuals`
