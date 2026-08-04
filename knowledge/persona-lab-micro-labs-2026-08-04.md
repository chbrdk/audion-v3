# Persona Lab micro-labs — Nav / Purchase / A+C

**Date:** 2026-08-04  
**Do not mix into Lab B matrix wave** (`pack-ebm-persona-lab-b`).

## Packs

| Pack id | Fixture | Runs | Correlate |
|---------|---------|------|-----------|
| `pack-ebm-persona-lab-nav` | `ebm-persona-lab-nav.ts` | `Nav-home-to-tool` maxSteps 12 | `persona-lab-nav-correlate.ts` (H3 URL/title) |
| `pack-ebm-persona-lab-purchase` | `ebm-persona-lab-purchase.ts` | `B-aufgabe1-purchase-intent` maxSteps 15 | Soft-Q / segment contrast vs Lab B |
| `pack-ebm-persona-lab-ac` | `ebm-persona-lab-ac.ts` | A maxSteps 8 + C maxSteps 18 | Unit / local smoke; full live C optional |

Personas resolve via `lab-persona-resolve` (DB ids on staging).

## How to run

### Nav proof (preferred staging smoke)

1. `POST /api/studies/from-pack` with `packId: pack-ebm-persona-lab-nav`, `projectId: proj-bosch-ebike-msd3hwtv`
2. Start → Sync
3. Correlate: `waveRunToPersonaLabNavSnapshot(run, { finalUrl, finalTitle })` → `correlatePersonaLabNavRun`
4. Pass: `closer` + final URL contains `produktkombinationen`

```bash
cd apps/web && pnpm exec vitest run __tests__/persona-lab-nav-correlate.test.ts __tests__/lab-persona-resolve.test.ts
```

### Purchase / A+C

Same from-pack flow with `pack-ebm-persona-lab-purchase` or `pack-ebm-persona-lab-ac`.  

**Live staging (2026-08-04):** `knowledge/lab-staging-smoke-micro-labs-live-2026-08-04.md`  
— Nav H3 fail (home abandon); Purchase/C short; A + Sam Lab B pass; Soft-Q 2/2.

## Paths

`paths.personaLabNavPackId` · `personaLabPurchasePackId` · `personaLabAcPackId` · `personaLabMicroLabsKnowledgePath`
