# Staging smoke — Nav H3 menu-open (`ac495ff`+)

**Date:** 2026-08-04  
**Goal:** close Nav H3 (home → `produktkombinationen` without deeplink)

## Diagnosis (try4 job `87a0a8cd`)

- Menu never opened; clicks stayed on closed home chrome.
- Confusion cues burned try budget via hallucinated Filter/unklar on home.
- Step 5 hit `/de/` (logo home loop).

## Fixes shipped

| Commit | Change |
|--------|--------|
| `e0168d3` | evaluate hover-equivalent, scrub path-home perception, skip confusion cues on home |
| `ac495ff` | CDP `mouseMoved` + int `wait(2)` (1.5 failed schema), retry after `no_opener` |
| *(next)* | leaf-only opener match (avoid whole nav strip), higher nav budget, strip `/de/` loops |

## Live evidence

### `e0168d3` job `768d1295…`

- `evaluate` → `nav_hover:no_opener` (selector too strict)
- then home loops / scrolls; confusion count **0** (scrub OK)

### `ac495ff` job `fd696104…`

- `evaluate` → `nav_hover:Produkte eBikes Service & Beratung…` (**whole strip**, wrong node)
- `wait 2s` OK
- then repeated `click /de/` until cancel — H3 still fail

## Still open

Hover must target the **Service** leaf control (not the aggregated nav), then click `Produktkombinationen` in the open mega-menu. Gate remains: `finalUrl` contains `produktkombinationen` and `deeplink_cheat=false`.
