# Mini-smoke — Luna + Vision + Hover-steer (2026-08-20)

**Knowledge:** `knowledge/ux-agent-luna-vision-2026-08-20.md` · `knowledge/ux-agent-click-hover-steer-2026-08-20.md`  
**Runs:** `knowledge/ueq-ebike-runs/2026-08-20-hover-smoke/`  
**Buckets:** `knowledge/ux-journey-fail-buckets-hover-smoke-2026-08-20.json`  
**Agent:** commit `a2c9b5f` · luna + vision high + keyword/hover harden

## Hover-smoke result (C, D, E, F · max_steps=25)

| Run | Steps | finalUrl | Bucket |
|-----|------:|----------|--------|
| C UC2 Service | 10 | `/de/service/bosch-ebike-newsletter-…` | **`goal_ok`** |
| D UC2 Technik | 9 | `/de/produkte/uebersicht` | **`goal_ok`** |
| E UC3 Über uns (Fahrer) | 11 | `/de/unternehmen/ueber-uns` | **`goal_ok`** |
| F UC3 Über uns (Interessent) | 10 | `/de/unternehmen/ueber-uns` | **`goal_ok`** |

### vs prior waves (URL-grounded, CDEF)

| Wave | n | goal_ok | click_no_nav | click_blocked |
|------|--:|--------:|-------------:|--------------:|
| Baseline 2026-08-19 | 16 | 12.5% | 62.5% | 18.8% |
| Vision-only smoke | 4 | 25% | 0% | 75% |
| **Hover-steer smoke** | **4** | **100%** | **0%** | **0%** |

**Lesen:** Keyword-Hygiene + Gate + Viewport-Hover hat den Engpass gelöst (n=4 Smoke, kein volles A/B). C landet im Service-Bereich (Newsletter-CTA) — grob Ziel erreicht, nicht idealer Help-Center-Treffer.

## Prior vision-only smoke (reference)

See earlier section in git history / `knowledge/ueq-ebike-runs/2026-08-20-vision-smoke/` — 1/4 goal_ok before hover-steer.
