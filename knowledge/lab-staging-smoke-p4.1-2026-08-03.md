# Staging smoke — P4.1 block-done-without-perception

**Date:** 2026-08-03  
**Commit:** `985fb0c`  
**Job:** `216102ab-ba4e-4732-943d-c14ea1e23e5a`  
**Persona:** `persona-alex-lab-ungeduldig-msdfje0b`

## Verdict: **Pass**

| Signal | Observed |
|--------|----------|
| steps | **4** (nav → find_elements → click → done) |
| stepsWithPerception | **3** |
| meanNoticed / max | **3.0** / 3 |
| abandonStep | **3** (done step stance=`abandon`) |
| stanceUpgraded | 0 (model chose abandon) |
| missingPerceptionClears / retries | **6** / 6 (gate nudged; no early force-done) |
| forcedDone | **0** |
| confusionAbandon | count 2, **forced true** |
| Soft-Q | Q2=**2**, Q3=**2** |
| Lab correlate | **closer 1.0** |
| Gold overlap | **0.6** (3/5: grau, Displays, Performance Line; miss Filter, unklar warum) |
| Gold closer | **true** (overlap + agentAbandon) |

## vs pre-P4.1

Before: 2 steps, 0 perception, force-done after missing block.  
After: real perception trail, abandon stance, gold closer.
