# Staging live smokes — Nav / Purchase / A+C / Sam Lab B

**Date:** 2026-08-04  
**Agent:** Luna · `UX_JOURNEY_TRY_BEFORE_ABANDON=3` · Soft-Q L6b on  
**Project:** `proj-bosch-ebike-msd3hwtv`  
**How-to:** `knowledge/persona-lab-micro-labs-2026-08-04.md`

## Summary

| Lab | Latest job | Steps | Friction | Soft-Q Q2/Q3 | Verdict |
|-----|------------|-------|----------|--------------|---------|
| **Nav H3** | `d17c11f1…` | 5 | 8 | 2/2 | **Still fail H3** — clicks Service/home, never lands on tool URL |
| **Purchase** | `4047747e…` | **8** | **8** | 2/2 | **Pass** (minSteps gate) |
| **A Erstkontakt** | `96a2b7f7…` | 5 | 8 | 2/2 (wave) | **Pass** |
| **C Kombination** | `c5746c4e…` | **7** | **8** | 2/2 (wave) | **Pass** after continuation fix |
| **Sam Lab B** | `25353178…` | **8** | 8 | 2/2 | **Pass** vs Alex explore-budget **5** |

Personas auto-resolved (Sam Lab B used one PATCH override on Lab B pack).

## Nav H3 (`pack-ebm-persona-lab-nav`)

- Study/wave final: `study-persona-lab-nav-final-2026-08-04-msee0d2c` / `wave-…msee0d3q`
- Job `d17c11f1-0536-41e8-8aab-bea64623d52e` after `c96d84c`
- Actions: navigate home → click `/de/` ×3 → done (forced abandon after explor 3/3)
- Finding: Service & Beratung seen; **page stayed on start**; no verified `produktkombinationen`
- Nav correlate: **closer=false** (`url_matches_tool` fail), score 0.75
- Progress vs first smoke: no matrix-gold leak on home; tries clicks instead of scroll-only — **selector still wrong** (clicks resolve to `/de/` not Service submenu / tool link)

**Open:** reliable element targeting for Service → Produktkombinationen (DOM/index selection), not more abandon bias.

## Purchase (`pack-ebm-persona-lab-purchase`)

- Rerun after `612db69`: job `4047747e…`, steps **8**, friction **8**, patient, Soft-Q 2/2  
**Status:** **Fixed** by minSteps done gate.

## A+C (`pack-ebm-persona-lab-ac`)

- Final study/wave: `study-persona-lab-ac-final-2026-08-04-msee3hxz` / `wave-…msee3hy9` after `c96d84c`
- **A** `96a2b7f7…`: 5 steps, forced abandon, VE true — Pass
- **C** `c5746c4e…`: **7** steps, VE true, friction 8; clicks Cargo Line / PowerPack / Kiox / Mini Remote then honest incomplete finish — **Pass**
- Prior broken C (`c7fcf51f…`): dict-scroll crash / invalidEvidence — fixed by typed ActionModel fallback + continuation retries

## Sam Lab B contrast

- Steps **8**, tp **0.2**, friction **8**, correlate closer 0.9 vs Alex **5** ✓

## Soft-Q

L6b assist on; Q2/Q3 ~2. Q4 often null on non-nav-success slices.

## Fix commits

| Commit | What |
|--------|------|
| `612db69` | Lab-B gold scoping + minSteps done gate + Nav click bias |
| `c96d84c` | Nav/C continuation retries + typed scroll fallback (C crash) |
| Deploy | agent `cll86x3pqxyb90frqe8e7rw5` @ `c96d84c` |
