# Staging smoke — Nav H3 menu-open

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
| `ac495ff` | CDP `mouseMoved` + int `wait(2)`, no_opener handling |
| `48771bf` / `68995a0` | leaf opener preference, CDP+wait primary, stop evaluate loops |
| `42011e6` | broaden `/de/` home-loop token match |

## Live evidence

### `e0168d3` — confusion scrub OK; hover miss

### `ac495ff` — wait works; hovered whole nav strip; `/de/` spam

### `68995a0` job `63860cf4…`

- Still early `/de/` clicks
- Later left home to `/de/connected-biking` (wrong page) → honest done
- Confusion count **0**; H3 still fail

## Still open

1. Force Service CDP hover **before** LLM clicks while header is in viewport.
2. Reliably block logo `/de/` loops in live action blobs.
3. Gate: `finalUrl` contains `produktkombinationen`, `deeplink_cheat=false`.
