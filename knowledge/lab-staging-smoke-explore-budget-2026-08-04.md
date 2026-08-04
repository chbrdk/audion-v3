# Staging smoke — explore budget 4–6 + persona resolve + Soft-Q L6b

**Date:** 2026-08-04  
**Commits:** `ffd1914` · `54f2259` · `4860593`  
**Deploy:** agent `lfv0921nlqzl0qow9xse4it4` + web `putvwgqq1c9yb30tsqosujde` @ `4860593`  
**Env:** `UX_JOURNEY_TRY_BEFORE_ABANDON=3` · `AUDION_SOFT_Q_LLM_ASSIST=1` · lab persona env ids set

## Alex Lab B (from-pack, no PATCH)

| Field | Value |
|-------|-------|
| Study | `study-persona-lab-b-explore-budget-smoke-2026-08-04-mse9c85z` |
| Wave | `wave-persona-lab-b-explore-budget-smoke-mse9c87a` |
| Persona (auto) | `persona-alex-lab-ungeduldig-msdfje0b` |
| Job | `ae533264-b2f9-428a-b2b7-d6adef454d45` |
| Steps | **5** (target 4–6) |
| Friction | **8** |
| Soft-Q Q2/Q3 | **2 / 2** (`LLM-assist:` rationales) |
| Goal | false |
| validEvidence | true |
| Confusion | grau/disabled · Filter-Ursache unklar · Abbruch |

**Verdict:** **Pass** — resolve without PATCH · explore band · Soft-Q assist still ~2.

## Ops

from-pack → Start is enough when web has `lab-persona-resolve` + env/path DB ids. Manual persona PATCH no longer required.
