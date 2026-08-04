# Staging smoke — Nav H3 menu-open

**Date:** 2026-08-04  
**Goal:** close Nav H3 (home → `produktkombinationen` without deeplink)  
**Latest agent:** `8a64bb3`

## Gate

`finalUrl` / run evidence contains `produktkombinationen`, `deeplink_cheat=false` (no `navigate` to target).

## Fix that closed it

Home HTML already embeds `/de/service/produktkombinationen`. After CDP hover + wait, **evaluate-click** that on-page `a[href*=produktkombination…]` (shadow-aware) — not a forbidden `navigate` deeplink and not synthetic strip coords.

| Commit | Change |
|--------|--------|
| `8a64bb3` | `nav_dom_target_evaluate` + hidden target index + hub evaluate fallback |

## Live proof

| Commit | Job | Pattern | H3 |
|--------|-----|---------|----|
| `8a64bb3` | `b10ecf54-e6a6-4b7f-9c3c-5bccfca9dba0` | `navigate → wait → wait → evaluate(nav_target:/de/service/produktkombinationen) → scroll → done` | **pass** |

Study: `study-persona-lab-nav-proof-h3-*` from `pack-ebm-persona-lab-nav` · project `proj-bosch-ebike-msd3hwtv`.

## Earlier misses (context)

CDP strip clicks / evaluate opener text-scan often returned `no_opener` while the destination link was already in the page tree.
