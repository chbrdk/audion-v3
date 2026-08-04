# UX Lab Archetypes (domain-agnostic)

**Status:** Accepted  
**Contracts:** `@audion-v3/contracts` — `UxLabArchetype`, `UxSuccessCriteria`, `UxScenarioPack`  
**Product example:** EBM / Bosch Produktkombinationen packs are a **reference family**, not the schema.

## Purpose

Unmoderated UX testing (NN/g, Oxford UX toolkit, UserTesting-style protocols) uses a small set of **goal-based task types**. AUDION Persona Labs map onto those archetypes so any product can be covered without inventing product-only chrome or stacking dozens of one-off packs.

Closer to human behavior comes from **fidelity** (perception, try-then-quit, n≥3 repeats, human-gold correlators) — not from pack count.

## Archetypes

| Id | Measures | Typical success | Industry analogue |
|----|----------|-----------------|-------------------|
| `first_impression` | Purpose / salience without deep task | Honest first-look narrative | Exploratory / natural behavior |
| `findability` | Start surface → destination without deeplink cheat | URL/title match + `deeplinkCheat=false` | Navigational |
| `task_goal` | Complete a concrete in-product goal | `goalReached` / done text | Goal-based task |
| `comprehension` | Understand logic (filters, disabled states, copy) | Named confusion or correct explanation | Logic / recall / comprehension |
| `segment_contrast` | Same task, different segment/persona | Soft-Q / step / friction delta | Segment matrix |
| `outcome_next_step` | What the user does after the check | Named CTA / next step (or gap) | Post-task outcome |
| `recovery` | Recover from error / wrong path / help | Recovered or honest abandon | Error recovery |
| `end_to_end` | Multi-step combination / flow | Flow complete or honest stop | End-to-end flow |

## Success criteria kinds

Declared on pack and/or run (`UxSuccessCriteria`):

| `kind` | Meaning |
|--------|---------|
| `url_match` | `finalUrl` matches `pattern` (regex string) |
| `title_match` | `finalTitle` matches `pattern` |
| `goal_text` | Finding / done text matches `pattern` |
| `honest_abandon` | Valid evidence with explicit abandon; goal may be unmet |

Path-finding honesty: when archetype is `findability`, Sync/Evaluate should prefer URL proof and track `deeplinkCheat`.

## Soft-Q

**Core scales** (product-agnostic): `ease`, `findability`, `clarity`, `usefulness`, `likelihood`, `overall`.

**Domain profiles** map core → product keys. Profile `ebm-produktkombinationen` keeps legacy `Q1_nuetzlichkeit`…`Q7_gesamteindruck` (UI/Evaluate unchanged for EBM). New packs may use core keys or a profile.

## Pack rules

1. Goal-based tasks; avoid UI label spoilers when testing findability.
2. One primary archetype per pack (secondary runs may differ, e.g. A+C).
3. Prefer opaque `urlKey` resolved via registry in `paths` / `resolveScenarioPackUrl`; absolute `https` only as escape; **unknown keys must not silently fall back to a product demo URL**.
4. Soft-Q “belastbar” only after **n≥3** validEvidence repeats per archetype on staging (policy), not after a single smoke.
5. Bosch/EBM packs remain valid examples under this taxonomy.

## EBM pack → archetype mapping

| Pack id | Primary archetype |
|---------|-------------------|
| `pack-ebm-persona-lab-b` | `task_goal` (+ comprehension cues) |
| `pack-ebm-persona-lab-nav` | `findability` |
| `pack-ebm-persona-lab-purchase` | `segment_contrast` |
| `pack-ebm-persona-lab-ac` | `first_impression` + `end_to_end` |
| `pack-ebm-persona-lab-produktnah` | `comprehension` / outcome preference |
| `pack-ebm-persona-lab-next-step` | `outcome_next_step` |
| `pack-lab-template-findability` | `findability` (non-Bosch template) |

## Correlate

Generic findability correlator: `apps/web/lib/lab-archetype-correlate.ts` — patterns from `successCriteria`, not brand strings. EBM Nav correlator wraps the same helpers with Bosch defaults for backward compatibility.
