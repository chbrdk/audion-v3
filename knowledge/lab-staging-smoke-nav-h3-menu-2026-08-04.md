# Staging smoke — Nav H3 menu-open

**Date:** 2026-08-04  
**Goal:** close Nav H3 (home → `produktkombinationen` without deeplink)  
**Latest agent:** `5bf1d65` (+ follow-ups)

## Diagnosis (try4 job `87a0a8cd`)

- Menu never opened; clicks stayed on closed home chrome.
- Confusion cues burned try budget via hallucinated Filter/unklar on home.
- Step 5 hit `/de/` (logo home loop).

## Fixes shipped

| Commit | Change |
|--------|--------|
| `e0168d3` … `42011e6` | hover-equivalent, CDP wait, home-loop tokens |
| `68d48e6` | synthetic CDP hover + index→href home-loop block |
| `a703c8e` | **wait ActionModel seconds-only** (coords broke validate → LLM scroll won) |
| `4d8358a` | clamp strip X into viewport; drop off-screen fallback |
| `e40ca6f` / `d4eb1d8` | evaluate Service click after wait; **one-shot** `menuClickUsed` |
| `5bf1d65` | `elementFromPoint` + hub-href fallback for opener click |

## Live evidence (2026-08-04 evening)

| Commit | Job | Pattern | H3 |
|--------|-----|---------|----|
| `a703c8e` | `ac2f5daa…` | wait ActionModel fixed; click@1463 miss | fail |
| `d4eb1d8` | `cea69706…` | `nav_click:no_opener` | fail |
| `5bf1d65` | `f00789ea…` | empty `nav_click:` | fail |
| `223b830` | `cb50ef4b…` | hub-href still `no_opener` | fail |
| `dcfb314` | `71eaad70…` | `cdp_click (731,70) ok=True` — still `/de/` | fail |
| `e001c52` | `154c8dbf…` | wait×4 + CDP sweep — still `/de/` then done | fail |

## Still open

1. CDP opener activation at synthetic Service coords does not leave home / open a usable submenu.
2. Need ground-truth coords or a real hub navigation (`/…/service/…`) that the AX map exposes.
3. Gate: `finalUrl` contains `produktkombinationen`, `deeplink_cheat=false`.
