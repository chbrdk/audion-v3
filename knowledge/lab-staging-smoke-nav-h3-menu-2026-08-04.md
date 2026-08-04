# Staging smoke — Nav H3 menu-open

**Date:** 2026-08-04  
**Goal:** close Nav H3 (home → `produktkombinationen` without deeplink)  
**Latest:** `511d433` (evaluate gate) · path-find `8a64bb3`

## Gate

`finalUrl` contains `produktkombinationen`, `deeplinkCheat=false`, Sync `goalReached=true`, Soft-Q **Q4** drafted, H3 auto-verdict from correlator (`navH3Pass=true`).

## Fix that closed path-finding

Home HTML already embeds `/de/service/produktkombinationen`. After CDP hover + wait, **evaluate-click** that on-page `a[href*=produktkombination…]` (shadow-aware) — not a forbidden `navigate` deeplink.

| Commit | Change |
|--------|--------|
| `8a64bb3` | `nav_dom_target_evaluate` + hub evaluate fallback |
| `511d433` | Agent `finalUrl` / URL `goalReached` override · Sync map · Soft-Q Q4 · H3 evaluate |

## Live proof

| Commit | Job | Pattern | Result |
|--------|-----|---------|--------|
| `8a64bb3` | `b10ecf54-…` | `navigate → wait → wait → evaluate(nav_target) → scroll → done` | path landed |
| `511d433` | `28086099-…` | `navigate → wait → wait → evaluate → done` | **finalUrl + Sync + Q4=4 + H3=refuted** |

Study pack: `pack-ebm-persona-lab-nav` · project `proj-bosch-ebike-msd3hwtv`.

H3 statement is „Kein natürlicher Einstieg“ → successful UI path **refutes** H3; Soft-Q Q4 rises.
