# Staging smoke — try-then-quit (Alex 2-seed + Sam)

**Date:** 2026-08-03  
**Agent commits:** `fdd2183` → `b24d51a` → `c11e4f7` (exploratory same-turn retry)  
**Coolify deploy:** agent `lfv0921nlqzl0qow9xse4it4` only  
**Model:** `gpt-5.6-luna`

## Personas (DB)

| Role | ID | tp |
|------|----|----|
| Impatient Alex | `persona-alex-lab-ungeduldig-msdfje0b` | 0.9 |
| Patient Sam | `persona-sam-lab-geduldig-msdroy3t` | 0.2 |

Project: `proj-bosch-ebike-msd3hwtv`

## Alex Lab B — 2 seeds (post `c11e4f7`)

Study/wave: `study-persona-lab-l2-l6b-deploy-smoke-2026-08-03-msdm3k8z` / `wave-persona-lab-b-deploy-smoke-msdm3k9g`

| Seed | Job | Steps | Friction | Soft-Q Q2/Q3 | Abandon/confusion | Pass? |
|------|-----|-------|----------|--------------|-------------------|-------|
| 1 | `dbf4429b-f80d-4f83-ac80-56c90e408c97` | **3** | **8** | **2/2** | ja (grau/Filter/unklar warum) | **Pass** |
| 2 | `ffe270d8-7d50-474a-8fa8-87f2d3915e43` | **3** | **8** | **2/2** | ja | **Pass** |

Pre-fix seeds on `fdd2183`/`b24d51a` still exited at **2** (soften emptied `done` → stop). After exploratory retry: steps **3** (in human band 3–8, not always 2).

## Sam patient contrast

Study/wave: `study-persona-lab-sam-patient-db-2026-08-03-msds5ghc` / `wave-persona-lab-b-sam-patient-msds5ghh`

| Job | Persona | Steps | Friction | Soft-Q | Notes |
|-----|---------|-------|----------|--------|-------|
| `91e88836-80c2-474a-8173-52ce1de12345` | Sam DB | **6** | **8** | Q2/Q3=2 | More steps than Alex; noticed PL + grau Displays; fixture-only pack id must be patched to DB id before start |

## Verdict

**Pass** for try-then-quit + satisficing contrast direction. Soft-Q L6b left **OFF**. Correlate expected closer (friction 8, Soft-Q 2, abandon named).

## Ops lesson

`from-pack` seeds fixture `persona-alex-lab-impatient` — always PATCH wave run to DB persona id before Start (same lesson as Alex lab seed).
