# Scenario packs (UX Studies)

**Date:** 2026-08-03  
**Product home:** UX Studies (`/studies`) — not a separate evaluation module

## Purpose

Reusable **Leitfaden → Study + Wave** seeds. Structured packs hold runs, Soft-Q keys, hypotheses, and F-Fragen prompts. PDFs stay reference sources; packs are the machine-readable SoT.

## EBM pack (first)

| Field | Value |
|-------|-------|
| Pack id | `pack-ebm-produktkombinationen` |
| Fixture | `apps/web/lib/fixtures/scenario-packs/ebm-produktkombinationen.ts` |
| Personas | `persona-alex-nachruester`, `persona-sam-kaufinteressent` |
| Target URL key | `bosch.ebike.produktkombinationen` → `paths.boschEbikeProduktkombinationenUrl` |
| Source | AUDION-v2 `knowledge/ebm-produktkombinationen-journey-tasks.json` |

## How to use

1. **Browse baseline Auswertung:** `/studies/study-ebm-produktkombinationen/waves/wave-audion-2026-07-30-mcp`
2. **New study from pack:** Studies → New study → Scenario pack → EBM → Create from pack
3. **Retest wave on existing study:** `createWaveFromScenarioPack(studyId, packId)` (lib) or New wave with pack runs
4. Wave **Start → Sync → Evaluate → Compare** vs `audion-2026-07-30-mcp`

API: `GET/POST paths.routes.apiStudiesFromPack` (`/api/studies/from-pack`)

## Contracts

`UxScenarioPack`, `UxStudyFromPackPayload`, `UxStudyFromPackResult` in `packages/contracts/src/ux-studies.ts`

## Out of scope (this slice)

- PDF OCR → pack
- Statistical n=15 / Testbirds sample
- MCP `run-ebm-*.py` port
