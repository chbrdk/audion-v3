# Staging smoke — P4 after agent redeploy

**Date:** 2026-08-03  
**Commit expected:** `cf780de`  
**Jobs:** `c00c451a…`, retry `b1b5189a…`  
**Persona:** `persona-alex-lab-ungeduldig-msdfje0b`

## Verdict

**Gate deployed, perception trail empty.** Soft-Q/correlate still draft from done-finding; human gold / abandon-stance **not** validated.

| Signal | Run 1 | Run 2 |
|--------|-------|-------|
| steps | 2 (nav→done) | 2 (nav→done) |
| `perceptionStats.stanceUpgraded` field | present | present |
| stepsWithPerception | **0** | **0** |
| forcedDone / retries | 1 / 1 | 1 / 1 |
| Soft-Q Q2/Q3 | 2 / 3 | 2 / 3 |
| Lab correlate | 0.86 | 0.81 |
| Gold overlap | 0 | 0 |
| `abandonStep` | null | null |

## Diagnosis

- New stats shape (`stanceUpgraded`) ⇒ P4 agent image is live.
- Gate path fires: missing `<<PERCEPTION>>` → one nudge → `forcedDone`.
- Done-step **reasoning** names Performance Line / ausgegraut, but model never wraps `<<PERCEPTION>>` → finalize/abandon upgrade never runs.
- Differs from pre-P4 smoke (`4b40d81f…`) which had find_elements + perception.

## Next fix (P4.1)

1. Stronger nudge / block `done` until valid PERCEPTION once after navigate.  
2. Or synthesize perception from thinking when grey/filter cues present before force-done.  
3. Re-smoke until `stepsWithPerception≥1`, `stance=abandon` or `stanceUpgraded`, gold ≥0.5.
