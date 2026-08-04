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
| Anzeigename | **Filter-Matrix: Nachrüsten (ungeduldig + geduldig)** |
| Fixture | `apps/web/lib/fixtures/scenario-packs/ebm-persona-lab-b.ts` |
| Personas | Alex fixture → DB `…ungeduldig…` **+** Sam fixture → DB `…geduldig…` via `lab-persona-resolve` |
| Runs | **2** × `B-aufgabe1-nachruesten` (Alex) + `B-aufgabe1-nachruesten-patient` (Sam), `maxSteps: 15` |
| Correlate | Alex: `persona-lab-correlate.ts` · Sam: L4/Soft-Q step contrast |
| Playbook | `knowledge/persona-iteration-lab-2026-08-03.md` |
| Resolve | `knowledge/persona-lab-persona-resolve-2026-08-04.md` — **no PATCH** for dual-persona |

Default wave enables impatient vs patient contrast (H5/L4) without manual PATCH.

## Micro-labs (separate from Lab B)

| Anzeigename | Pack id | Notes |
|-------------|---------|-------|
| Auffindbarkeit: Home → Produktkombinationen | `pack-ebm-persona-lab-nav` | Home → tool; `persona-lab-nav-correlate` |
| Kaufinteressent: passende Displays finden | `pack-ebm-persona-lab-purchase` | Segment Soft-Q contrast |
| Erstkontakt + Kombinationscheck | `pack-ebm-persona-lab-ac` | Erstkontakt + Kombination, capped |
| Produktnahe Kurzantwort statt Matrix | `pack-ebm-persona-lab-produktnah` | H4 / Q5 |
| Nächster Schritt nach der Prüfung | `pack-ebm-persona-lab-next-step` | F3.8 / F3.9 Next Step |

Playbook: `knowledge/persona-lab-micro-labs-2026-08-04.md`

After Sync, map the wave run with `waveRunToPersonaLabSnapshot` → `correlatePersonaLabRun`. **closer: true** = within human gold band (high friction, confusion named, step budget, not optimistic).

```bash
cd apps/web && pnpm exec vitest run __tests__/persona-lab-correlate.test.ts __tests__/lab-persona-resolve.test.ts __tests__/persona-lab-nav-correlate.test.ts __tests__/scenario-packs.test.ts
```

## How to use

1. **Browse baseline Auswertung:** `/studies/study-ebm-produktkombinationen/waves/wave-audion-2026-07-30-mcp`
2. **New study from pack:** Studies → New study → Scenario pack → EBM → Create from pack
3. **Persona lab (Alex + Sam):** Create from pack `pack-ebm-persona-lab-b` → Start → Sync → correlate Alex snapshot; compare Sam steps/Soft-Q
4. **Retest wave on existing study:** `createWaveFromScenarioPack(studyId, packId)` (lib) or New wave with pack runs
5. Wave **Start → Sync → Evaluate → Compare** vs `audion-2026-07-30-mcp` (full EBM pack)

API: `GET/POST paths.routes.apiStudiesFromPack` (`/api/studies/from-pack`)

## Contracts

`UxScenarioPack`, `UxStudyFromPackPayload`, `UxStudyFromPackResult` in `packages/contracts/src/ux-studies.ts`

## Out of scope (this slice)

- PDF OCR → pack
- Statistical n=15 / Testbirds sample
- MCP `run-ebm-*.py` port
- Live staging runs of Produktnah / Next-Step (post-deploy)