# Staging smoke — friction band floor 7

**Date:** 2026-08-03  
**Commit:** `e1b9fe9` (agent Coolify deploy `jniyhxyg9tsi7sy2ipf7rso4`)  
**Job:** `1e6e8142-e4fd-429a-975d-3ac1ffac8323`  
**Model:** `gpt-5.6-luna`  
**Study / wave:** `study-persona-lab-l2-l6b-deploy-smoke-2026-08-03-msdm3k8z` / `wave-persona-lab-b-deploy-smoke-msdm3k9g`

## Verdict: **Pass (correlate 1.0)**

| Signal | Observed |
|--------|----------|
| frictionScore | **8** (was 6 on luna A/B) |
| confusion.floor1 / floor2 | **7 / 8** |
| abandonBump | **true** |
| tags | perception `disabled_option_unexplained` + narration `filter_cause_unknown` |
| Soft-Q Q2 / Q3 | **2 / 2** |
| Lab correlate | **1.0 closer** · friction_band pass |
| meanFrictionValidOnly | 8 |
| stance | abandon @ step 2 |

## vs Luna A/B (`e0a4ce65`)

| | A/B luna | floor-7 smoke |
|--|----------|---------------|
| Friction | 6 | **8** |
| Correlate | 0.86 | **1.0** |
| Floor default | 6 | **7** + abandonBump |
