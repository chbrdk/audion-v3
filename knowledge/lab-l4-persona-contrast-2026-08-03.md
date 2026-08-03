# Lab L4 — impatient Alex vs patient Sam

**Date:** 2026-08-03  
**Scripts:** `LAB_PERSONA=impatient|patient ./scripts/local-lab-run.sh` · `./scripts/local-lab-compare.sh A.json B.json`  
**Checks:** `services/ux-journey-agent/persona_lab_l4.py`

## Expectation

Same B-task URL; persona dims flipped:

| Signal | Impatient Alex | Patient Sam |
|--------|----------------|-------------|
| `time_pressure` | ≥0.75 | ≤0.34 |
| `stepBudget.impatientApplied` | true (max≈10) | false (max=request) |
| `confusionAbandon.enabled/forced` | on / often forced | off |
| Steps | fewer, early done | ≥ Alex steps, more clicks/scrolls |

Friction can stay high for **both** when matrix confusion tags fire (L3 floor) — abandon rate + step budget are the primary contrast.

## Local A/B (2026-08-03)

| | Alex L3 `a6386873…` | Sam L4 `10dd38a2…` |
|--|---------------------|---------------------|
| Steps | 5 | **8** |
| maxSteps | 10 | **40** |
| impatientApplied | true | **false** |
| abandonForced | true | **false** |
| time_pressure | 0.9 | **0.2** |
| friction | 8 | 8 (floor applied) |
| fit | 3 | 6 |
| goal | false | false |

Paths: `paths.personaLabImpatientPersonaId` / `paths.personaLabPatientPersonaId`
