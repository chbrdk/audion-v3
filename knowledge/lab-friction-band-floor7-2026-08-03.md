# Lab — friction band floor 7 + perception tags

**Date:** 2026-08-03  
**Why:** Luna smoke job had Soft-Q/gold OK but correlate **0.86** because `frictionScore=6` (gold band **7–10**). L3 floor_1 default was 6; collector ignored `perception.confusion`.

## Fix

1. Default `UX_JOURNEY_CONFUSION_FRICTION_FLOOR_1` **6 → 7**
2. Collect `step.perception.confusion` (source `perception`)
3. Abandon stance + ≥1 tag → bump to floor_2 (8)

## Tests

`services/ux-journey-agent/test_confusion_friction.py` — default floor 7, perception collect, abandonBump.

## Staging expect (after agent deploy)

- Luna Lab B: `frictionScore` ∈ 7–10
- `scorecard.confusion.floor` ≥ 7; often 8 with abandonBump or 2 tags
- correlate → 1.0 when Soft-Q/gold already green
