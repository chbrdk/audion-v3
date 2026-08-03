# P5 — Gold cues Filter/unklar warum + fewer missing retries

**Date:** 2026-08-03  
**Why:** P4.1 smoke gold overlap 0.6 (miss Filter, unklar warum) while budget was already full of verbose noticed; missingPerceptionClears=6 with default 3 retries.

## Changes

1. **Prompt:** Impatient must name Filter + „unklar warum“ when displays look grey/disabled; set confusion tag.
2. **Enrich:** Synonyms (kompatibil, ohne Ursache, greyed, …); when budget full, **fold** critical labels into existing noticed slots (no drop of Performance Line/grau).
3. **Retries:** `UX_JOURNEY_PERCEPTION_MISSING_RETRIES` default **2** (was 3); shorter nudge.

## Staging expect

- Gold overlap ≥ 0.8 (ideally 5/5 or 4/5 with Filter + unklar warum)
- `missingPerceptionClears` / retries lower than P4.1’s 6
- Soft-Q Q2/Q3 ≈ 2, correlate closer, abandon still present
