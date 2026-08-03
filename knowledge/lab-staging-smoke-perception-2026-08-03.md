# Staging smoke — Perception-in-the-loop

**Date:** 2026-08-03  
**Commit:** `9b31a3d` (web + ux-journey-agent redeployed)  
**Study / wave:** `study-persona-lab-l2-l6b-deploy-smoke-2026-08-03-msdm3k8z` / `wave-persona-lab-b-deploy-smoke-msdm3k9g`  
**Job:** `4b40d81f-c52e-4f82-9fa7-f8363050c695`  
**Persona (DB):** `persona-alex-lab-ungeduldig-msdfje0b` · tp **0.9**

## Verdict

**Pass for lab correlate + Soft-Q.** Perception gate is live on staging. Offline human-gold keyword overlap still weak (scorer miss / short trail).

| Signal | Observed |
|--------|----------|
| Health | web + uxagent `200` |
| `stepBudget` | maxSteps **10**, min **3**, `impatientApplied`, tp **0.9** |
| `perceptionStats` | stepsWithPerception **1**, meanNoticed **1**, confusionCount **1**, forcedDone **1**, retries **2** |
| Steps | **3** (navigate → find_elements → done) |
| Step 2 perception | stance=`proceed`, noticed=`Display-Karten grau`, clarity=1, confusion=`filter_cause_unknown`, ignoredGuess set |
| `confusionAbandon` | count **1**, forced **false** (under threshold) |
| Friction / fit / goal | **8** / **2** / false |
| `validEvidence` | **true** |
| Soft-Q | **Q2=2**, **Q3=2** (Think-Aloud draft) |
| `summary` | non-empty (felt-state / perception synth) |
| Lab correlate | **closer score 1.0** |
| Perception gold overlap | **0.4** (hits 2/5: grau, Displays; miss Filter / Performance Line / unklar warum) |

## Notes

- Intent-align / gate: `retries: 2`, `forcedDone: 1` — stance/align forced early exit after find_elements.
- Only LLM decision step carried `perception`; navigate/done without block is expected.
- Reuse same wave for future perception diffs; always force-start with DB persona id (not fixture-only).
