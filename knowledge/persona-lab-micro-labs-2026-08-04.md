# Persona Lab micro-labs — Katalog

**Date:** 2026-08-04 (domain-agnostic archetypes)  
**SoT:** [`specs/domain/ux-lab-archetypes.md`](../specs/domain/ux-lab-archetypes.md)

Bosch / EBM packs are a **reference family**. Labs are slices of unmoderated UX task types (findability, task_goal, …), not a Bosch-only product.

**Filter-Matrix Lab B** (`pack-ebm-persona-lab-b`) is the dual-persona matrix wave. Do not mix other archetype tasks into that wave.

## Pack-Katalog (Anzeigename ↔ Pack-ID ↔ Archetyp)

| Anzeigename (`name`) | Pack id | Archetyp | Fokus | Correlate / Soft-Q |
|----------------------|---------|----------|-------|--------------------|
| Filter-Matrix: Nachrüsten (ungeduldig + geduldig) | `pack-ebm-persona-lab-b` | `task_goal` | H1/H2/H5 | `persona-lab-correlate` |
| Auffindbarkeit: Home → Produktkombinationen | `pack-ebm-persona-lab-nav` | `findability` | H3 / Q4 | `persona-lab-nav-correlate` → generic findability |
| Kaufinteressent: passende Displays finden | `pack-ebm-persona-lab-purchase` | `segment_contrast` | H5 | Soft-Q vs Lab B |
| Erstkontakt + Kombinationscheck | `pack-ebm-persona-lab-ac` | `first_impression` + `end_to_end` | A + C | Soft-Q |
| Produktnahe Kurzantwort statt Matrix | `pack-ebm-persona-lab-produktnah` | `comprehension` | H4 / Q5 | Soft-Q Q5/Q1 |
| Nächster Schritt nach der Prüfung | `pack-ebm-persona-lab-next-step` | `outcome_next_step` | F3.8 / F3.9 | Soft-Q Q1/Q6/Q7 |
| Template: Findability (non-Bosch) | `pack-lab-template-findability` | `findability` | URL successCriteria | `lab-archetype-correlate` |

Pack-IDs und `runKey`s bleiben stabil. Soft-Q “belastbar” erst nach n≥3 validEvidence repeats pro Archetyp (Policy).

Personas resolve via `lab-persona-resolve` (DB ids on staging).

## How to run

1. `POST /api/studies/from-pack` with packId + `projectId`
2. Start → Sync → Evaluate
3. Findability: correlate via `correlateFindabilityRun` / Nav wrapper; pass = URL pattern match + no deeplink cheat

```bash
cd apps/web && pnpm exec vitest run __tests__/persona-lab-nav-correlate.test.ts __tests__/lab-archetype-correlate.test.ts __tests__/lab-persona-resolve.test.ts __tests__/scenario-packs.test.ts
```

## Paths

`paths.personaLabPackId` · `personaLabNavPackId` · `personaLabPurchasePackId` · `personaLabAcPackId` · `personaLabProduktnahPackId` · `personaLabNextStepPackId` · `labTemplateFindabilityPackId` · `personaLabMicroLabsKnowledgePath` · `uxLabArchetypesSpecPath`
