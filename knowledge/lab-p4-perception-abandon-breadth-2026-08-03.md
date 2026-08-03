# P4 — Perception breadth + impatient abandon hard-upgrade

**Date:** 2026-08-03  
**Code:** `services/ux-journey-agent/perception.py` (`finalize_perception_for_persona`, `apply_impatient_abandon_stance`, `enrich_noticed_from_perception_text`)  
**Wire:** `main.py` gate `_once` + `_apply_persona_perception_finalize` on result steps

## Why

Staging smoke after P0–P3: Soft-Q/correlate green, but perception trail was **1 noticed**, stance stayed **proceed**, exit via **forcedDone**/align retries — not human-like abandon.

## Rules

1. Prompt: fill salience budget with distinct aspects (grau, Filter/Ursache, Produktlinie).
2. Hard: `time_pressure ≥ 0.75` + confusion/clarity≤1 + grey-filter signal → `stance=abandon` (+ `stanceUpgraded`).
3. Enrich: lift cues already in think/why into `noticed[]` (no invented UI).
4. Align-all-dropped under that rule → abandon, not click thrash.

## Staging checks (after Coolify agent redeploy)

- Job with DB persona `persona-alex-lab-ungeduldig-msdfje0b`
- `perception.stance == abandon` or `stanceUpgraded`
- `perceptionStats.abandonStep` not null; gold overlap ≥ 0.5
- Soft-Q Q2/Q3 ≈ 2; lab correlate closer
