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
| `68d48e6` | `0f453988…` | wait validate fail → scroll → force done | fail |
| `a703c8e` | `ac2f5daa…` | wait×2 → click@1463 miss | fail |
| `4d8358a` | `1716b681…` | still off-screen strip via uncapped fallback | fail |
| `e40ca6f` | `c84e2117…` | evaluate **loop** (cancelled) | fail |
| `d4eb1d8` | `cea69706…` | wait×2 → `nav_click:no_opener` → scroll → done | fail |
| `5bf1d65` | `f00789ea…` | wait×2 → `nav_click:` (empty label) → done on `/de/` | fail |

## Still open

1. Opener evaluate must land on a real Service control / `/…/service/` hub (not empty `elementFromPoint` hit).
2. After opener, hunt `produktkombinationen` target AX before honest done.
3. Gate: `finalUrl` contains `produktkombinationen`, `deeplink_cheat=false`.
