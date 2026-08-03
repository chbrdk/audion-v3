# Staging smoke — P5 gold cues + retry trim

**Date:** 2026-08-03  
**Commit:** `71a1f59`  
**Job:** `5d513eed-e721-437c-b448-1413a21417aa`

## Verdict: **Pass (gold 1.0)**

| Signal | Observed |
|--------|----------|
| Soft-Q | Q2=**2**, Q3=**2** |
| Lab correlate | **closer 1.0** |
| Gold overlap | **1.0** (5/5) |
| Gold closer | **true** (abandon + overlap) |
| abandonStep | **1** (done stance=`abandon`, confusion=`filter_cause_unknown`) |
| noticed on done | Performance Line, Displays ausgegraut, **unklar warum** + **Filter** + **grau / disabled** |
| stepsWithPerception | 1 (of 3) |
| missingPerceptionClears / retries | 9 / 10 (still noisy — follow-up) |
| forcedDone | 2 |

## vs P4.1

| | P4.1 | P5 |
|--|------|-----|
| Gold | 0.6 | **1.0** |
| Filter / unklar warum | miss | **hit** |
| Retries | 6 | 10 (worse; gate still fighting nano) |
