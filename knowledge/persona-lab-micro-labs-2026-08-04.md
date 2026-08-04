# Persona Lab micro-labs — Katalog

**Date:** 2026-08-04 (rename + H4 / Next-Step packs)  
**Filter-Matrix Lab B** (`pack-ebm-persona-lab-b`, Anzeigename *Filter-Matrix: Nachrüsten (ungeduldig + geduldig)*) ist die dual-persona Matrix-Welle (Alex + Sam, gleiche Owner-Aufgabe 1).  
**Do not mix** Nav / Purchase / A+C / Produktnah / Next-Step *tasks* into that matrix wave — keep micro-labs separate.

## Pack-Katalog (Anzeigename ↔ Pack-ID ↔ Leitfaden)

| Anzeigename (`name`) | Pack id | Fixture | Leitfaden-Block / Fokus | Runs | Correlate / Soft-Q |
|----------------------|---------|---------|-------------------------|------|--------------------|
| Filter-Matrix: Nachrüsten (ungeduldig + geduldig) | `pack-ebm-persona-lab-b` | `ebm-persona-lab-b.ts` | Aufgabe 1 · H1/H2/H5 | Alex + Sam maxSteps 15 | `persona-lab-correlate` (Alex); Sam L4 |
| Auffindbarkeit: Home → Produktkombinationen | `pack-ebm-persona-lab-nav` | `ebm-persona-lab-nav.ts` | H3 / Q4 | `Nav-home-to-tool` maxSteps 12 | `persona-lab-nav-correlate` |
| Kaufinteressent: passende Displays finden | `pack-ebm-persona-lab-purchase` | `ebm-persona-lab-purchase.ts` | H5 Segment | `B-aufgabe1-purchase-intent` maxSteps 15 | Soft-Q / Segment vs Lab B |
| Erstkontakt + Kombinationscheck | `pack-ebm-persona-lab-ac` | `ebm-persona-lab-ac.ts` | A + C | A maxSteps 8 + C maxSteps 18 | Unit / local smoke |
| Produktnahe Kurzantwort statt Matrix | `pack-ebm-persona-lab-produktnah` | `ebm-persona-lab-produktnah.ts` | H4 / Q5 | `H4-produktnah-kurzantwort` maxSteps 12 | Soft-Q Q5/Q1 |
| Nächster Schritt nach der Prüfung | `pack-ebm-persona-lab-next-step` | `ebm-persona-lab-next-step.ts` | F3.8 / F3.9 (H3-Richtung) | `F38-next-step-after-check` maxSteps 15 | Soft-Q Q1/Q6/Q7 |

Pack-IDs und `runKey`s bleiben stabil (Staging-Smokes / Correlatoren). Nur Anzeigenamen / Descriptions / `leitfadenBlock` sind deutsch und aufgabenklar.

Personas resolve via `lab-persona-resolve` (DB ids on staging).

## How to run

### Nav proof (preferred staging smoke)

1. `POST /api/studies/from-pack` with `packId: pack-ebm-persona-lab-nav`, `projectId: proj-bosch-ebike-msd3hwtv`
2. Start → Sync
3. Correlate: `waveRunToPersonaLabNavSnapshot(run, { finalUrl, finalTitle })` → `correlatePersonaLabNavRun`
4. Pass: `closer` + final URL contains `produktkombinationen`

```bash
cd apps/web && pnpm exec vitest run __tests__/persona-lab-nav-correlate.test.ts __tests__/lab-persona-resolve.test.ts __tests__/scenario-packs.test.ts
```

### Purchase / A+C / Produktnah / Next-Step

Same from-pack flow with:

- `pack-ebm-persona-lab-purchase`
- `pack-ebm-persona-lab-ac`
- `pack-ebm-persona-lab-produktnah` (H4/Q5 gap from Auswertung)
- `pack-ebm-persona-lab-next-step` (F3.8/F3.9 gap from Auswertung)

**Live staging (2026-08-04):** `knowledge/lab-staging-smoke-micro-labs-live-2026-08-04.md`  
— Purchase + C + A + Sam Lab B pass after `612db69`/`c96d84c`; **Nav H3 still open** (no tool URL). Soft-Q 2/2.  
Neue Packs Produktnah / Next-Step: erst nach Deploy live smoken (nicht in diesem Slice).

## Paths

`paths.personaLabPackId` · `personaLabNavPackId` · `personaLabPurchasePackId` · `personaLabAcPackId` · `personaLabProduktnahPackId` · `personaLabNextStepPackId` · `personaLabMicroLabsKnowledgePath`
