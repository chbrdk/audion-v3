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

## Persona Lab pack (fast iteration)

| Field | Value |
|-------|-------|
| Pack id | `paths.personaLabPackId` → `pack-ebm-persona-lab-b` |
| Fixture | `apps/web/lib/fixtures/scenario-packs/ebm-persona-lab-b.ts` |
| Persona | `paths.personaLabImpatientPersonaId` → `persona-alex-lab-impatient` |
| Runs | **1** × `B-aufgabe1-nachruesten`, `maxSteps: 15` |
| Correlate | `apps/web/lib/persona-lab-correlate.ts` · tests `__tests__/persona-lab-correlate.test.ts` |
| Playbook | `knowledge/persona-iteration-lab-2026-08-03.md` |

After Sync, map the wave run with `waveRunToPersonaLabSnapshot` → `correlatePersonaLabRun`. **closer: true** = within human gold band (high friction, confusion named, step budget, not optimistic).

```bash
cd apps/web && pnpm exec vitest run __tests__/persona-lab-correlate.test.ts
```

## How to use

1. **Browse baseline Auswertung:** `/studies/study-ebm-produktkombinationen/waves/wave-audion-2026-07-30-mcp`
2. **New study from pack:** Studies → New study → Scenario pack → EBM → Create from pack
3. **Persona lab (1 run):** Create from pack `pack-ebm-persona-lab-b` → Start → Sync → correlate snapshot
4. **Retest wave on existing study:** `createWaveFromScenarioPack(studyId, packId)` (lib) or New wave with pack runs
5. Wave **Start → Sync → Evaluate → Compare** vs `audion-2026-07-30-mcp` (full EBM pack)

API: `GET/POST paths.routes.apiStudiesFromPack` (`/api/studies/from-pack`)

## Contracts

`UxScenarioPack`, `UxStudyFromPackPayload`, `UxStudyFromPackResult` in `packages/contracts/src/ux-studies.ts`

## Out of scope (this slice)

- PDF OCR → pack
- Statistical n=15 / Testbirds sample
- MCP `run-ebm-*.py` port
